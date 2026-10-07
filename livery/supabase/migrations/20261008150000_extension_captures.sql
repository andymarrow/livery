-- The browser extension's server side.
--
--   extension_pairings: a short one-time code shown on livery.site/extension/connect
--                       (signed in); the extension trades it for a token.
--   extension_tokens:   what the extension sends with every request. Stored as
--                       a sha256 hash, revocable, expiring.
--   page_captures:      a page measured inside the user's own browser (behind
--                       their login): measurements and a content-removed frame,
--                       never text. Private to its owner.
--
-- A kit version's sources can now be captures as well as published page
-- versions. Versions that include a capture are private (the server builds
-- them through start_owner_version, below).

create table public.extension_pairings (
  code_hash   text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  user_id     uuid not null references auth.users (id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index extension_pairings_user_idx on public.extension_pairings (user_id);

create table public.extension_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  token_hash    text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  label         text not null default 'Browser extension' check (length(label) between 1 and 120),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  expires_at    timestamptz not null,
  revoked_at    timestamptz
);

create index extension_tokens_user_idx on public.extension_tokens (user_id);

create table public.page_captures (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  url              text not null check (url ~ '^https?://' and length(url) <= 2048),
  host             text not null check (length(host) between 1 and 253),
  domain           text not null check (length(domain) between 1 and 253),
  viewport_width   integer not null check (viewport_width between 200 and 4000),
  viewport_height  integer not null check (viewport_height between 200 and 4000),
  data             jsonb not null,
  frame_path       text,
  created_at       timestamptz not null default now()
);

create index page_captures_owner_idx on public.page_captures (owner_id, domain);

-- Sources: either a published page version or a capture.
alter table public.kit_sources alter column source_version_id drop not null;
alter table public.kit_sources add column capture_id uuid references public.page_captures (id) on delete restrict;
alter table public.kit_sources add constraint kit_sources_one_kind
  check ((source_version_id is null) <> (capture_id is null));
create index kit_sources_capture_idx on public.kit_sources (capture_id) where capture_id is not null;

alter table public.extension_pairings enable row level security;
alter table public.extension_tokens enable row level security;
alter table public.page_captures enable row level security;
revoke all on public.extension_pairings, public.extension_tokens, public.page_captures from anon, authenticated;
grant select on public.extension_tokens, public.page_captures to authenticated;

create policy "Users see their extension connections"
  on public.extension_tokens for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users see their captures"
  on public.page_captures for select to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- start_owner_version: the next (private) version of a kit its owner is
-- adding captured pages to. Every source must be a ready page version the
-- owner may see, or a capture the owner made. Takes the build lock.
-- p_sources: [{position, source_url, domain, source_version_id | capture_id}]
-- ---------------------------------------------------------------------------
create function public.start_owner_version(
  p_kit_id uuid,
  p_owner uuid,
  p_sources jsonb,
  p_sources_hash text,
  p_extractor_version integer,
  p_flow_version integer,
  p_stale_after interval default interval '10 minutes'
)
returns table (kit_id uuid, kit_version_id uuid, claimed boolean)
language plpgsql
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_total integer := jsonb_array_length(p_sources);
  v_valid integer;
begin
  if not exists (select 1 from public.kits k where k.id = p_kit_id and k.owner_id = p_owner) then
    raise exception 'kit % is not owned by this user', p_kit_id using errcode = '42501';
  end if;
  if v_total < 1 or v_total > 12 then
    raise exception 'a kit takes 1 to 12 sources' using errcode = '22023';
  end if;

  select count(*) into v_valid
  from jsonb_to_recordset(p_sources) as s(position smallint, source_url text, domain text, source_version_id uuid, capture_id uuid)
  where (s.capture_id is not null and exists (select 1 from public.page_captures c where c.id = s.capture_id and c.owner_id = p_owner))
     or (s.source_version_id is not null and exists (
           select 1 from public.kit_versions v join public.kits k on k.id = v.kit_id
           where v.id = s.source_version_id and v.status = 'ready' and (v.visibility = 'public' or k.owner_id = p_owner)));
  if v_valid <> v_total then
    raise exception 'every source must be a published page version or your own capture' using errcode = '22023';
  end if;

  insert into public.sites (domain)
  select distinct s.domain from jsonb_to_recordset(p_sources) as s(domain text)
  on conflict (domain) do nothing;

  update public.kit_versions v
  set status = 'failed', error = 'stale build'
  where v.kit_id = p_kit_id and v.status = 'building' and v.build_started_at < now() - p_stale_after;

  begin
    insert into public.kit_versions (kit_id, extractor_version, flow_version, sources_hash, visibility, private_key)
    values (p_kit_id, p_extractor_version, p_flow_version, p_sources_hash, 'private', private.new_private_key('private'))
    returning id into v_version_id;
  exception when unique_violation then
    select v.id into v_version_id from public.kit_versions v where v.kit_id = p_kit_id and v.status = 'building';
    return query select p_kit_id, v_version_id, false;
    return;
  end;

  insert into public.kit_sources (kit_version_id, position, source_url, domain, source_version_id, capture_id)
  select v_version_id, s.position, s.source_url, s.domain, s.source_version_id, s.capture_id
  from jsonb_to_recordset(p_sources) as s(position smallint, source_url text, domain text, source_version_id uuid, capture_id uuid);

  return query select p_kit_id, v_version_id, true;
end;
$$;

revoke execute on function public.start_owner_version(uuid, uuid, jsonb, text, integer, integer, interval) from public, anon, authenticated;
grant execute on function public.start_owner_version(uuid, uuid, jsonb, text, integer, integer, interval) to service_role;
