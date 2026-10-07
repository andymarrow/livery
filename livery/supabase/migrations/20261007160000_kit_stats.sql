-- Views, likes and downloads per kit, counted once per person.
--
-- There are no accounts, so a "person" is two fingerprints, both stored only
-- as salted sha256 hashes (never raw IPs or ids):
--   visitor: a random id kept in a first-party cookie (or, for agents and
--            curl, the network fingerprint itself)
--   network: the IP address and user agent together
-- An event counts only if BOTH are new for that kit and kind, so repeated
-- clicks count once, and clearing cookies doesn't count again from the same
-- browser on the same network.

create table public.kit_events (
  kit_id      uuid not null references public.kits (id) on delete cascade,
  kind        text not null check (kind in ('view', 'like', 'download')),
  visitor     text not null check (visitor ~ '^[0-9a-f]{64}$'),
  network     text not null check (network ~ '^[0-9a-f]{64}$'),
  created_at  timestamptz not null default now(),
  primary key (kit_id, kind, visitor)
);

create unique index kit_events_network_idx on public.kit_events (kit_id, kind, network);

-- Running totals, so listings and sorting never count rows.
create table public.kit_stats (
  kit_id     uuid primary key references public.kits (id) on delete cascade,
  views      integer not null default 0 check (views >= 0),
  likes      integer not null default 0 check (likes >= 0),
  downloads  integer not null default 0 check (downloads >= 0),
  updated_at timestamptz not null default now()
);

create index kit_stats_likes_idx on public.kit_stats (likes desc);
create index kit_stats_downloads_idx on public.kit_stats (downloads desc);
create index kit_stats_views_idx on public.kit_stats (views desc);

insert into public.kit_stats (kit_id) select id from public.kits on conflict do nothing;

create function private.create_kit_stats()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.kit_stats (kit_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger kits_create_stats
  after insert on public.kits
  for each row execute function private.create_kit_stats();

create function private.count_kit_event()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_kit uuid := coalesce(new.kit_id, old.kit_id);
  v_kind text := coalesce(new.kind, old.kind);
  v_delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  insert into public.kit_stats (kit_id) values (v_kit) on conflict do nothing;
  update public.kit_stats s
  set views = s.views + case when v_kind = 'view' then v_delta else 0 end,
      likes = greatest(0, s.likes + case when v_kind = 'like' then v_delta else 0 end),
      downloads = s.downloads + case when v_kind = 'download' then v_delta else 0 end,
      updated_at = now()
  where s.kit_id = v_kit;
  return coalesce(new, old);
end;
$$;

create trigger kit_events_count
  after insert or delete on public.kit_events
  for each row execute function private.count_kit_event();

-- record_kit_event: true when this counted (first time for this person).
create function public.record_kit_event(p_kit_id uuid, p_kind text, p_visitor text, p_network text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_rows integer;
begin
  insert into public.kit_events (kit_id, kind, visitor, network)
  values (p_kit_id, p_kind, p_visitor, p_network)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- remove_like: takes back this person's like (matched by either fingerprint).
create function public.remove_like(p_kit_id uuid, p_visitor text, p_network text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_rows integer;
begin
  delete from public.kit_events
  where kit_id = p_kit_id and kind = 'like' and (visitor = p_visitor or network = p_network);
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

alter table public.kit_events enable row level security;
alter table public.kit_stats enable row level security;
revoke all on public.kit_events, public.kit_stats from anon, authenticated;
grant select on public.kit_stats to anon, authenticated;

create policy "Stats of published kits are public"
  on public.kit_stats for select
  to anon, authenticated
  using (exists (select 1 from public.kit_versions v where v.kit_id = kit_stats.kit_id and v.status = 'ready'));

revoke execute on function public.record_kit_event(uuid, text, text, text), public.remove_like(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_kit_event(uuid, text, text, text), public.remove_like(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- kit_library: one row per kit, its newest published version plus its
-- totals. The library lists and sorts this (by date, likes, downloads or
-- views) instead of every version. security_invoker keeps the callers' RLS.
-- ---------------------------------------------------------------------------
create view public.kit_library with (security_invoker = true) as
select distinct on (v.kit_id)
  v.id, v.kit_id, v.version, v.published_at, v.data, v.grant_hash,
  coalesce(s.views, 0) as views,
  coalesce(s.likes, 0) as likes,
  coalesce(s.downloads, 0) as downloads
from public.kit_versions v
left join public.kit_stats s on s.kit_id = v.kit_id
where v.status = 'ready'
order by v.kit_id, v.version desc;

grant select on public.kit_library to anon, authenticated;
