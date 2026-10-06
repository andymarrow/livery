-- Livery core schema.
--
-- Access model (v1, no accounts):
--   * All writes go through server code using the service role, via the
--     functions at the bottom of this file. anon/authenticated can never write.
--   * anon/authenticated may only read published (ready) kits and their items.
--   * A published kit version is permanent. It can be withdrawn, never edited.

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- sites: one row per host. Holds the owner's opt-in or opt-out.
-- ---------------------------------------------------------------------------
create table public.sites (
  domain            text primary key
                    check (domain = lower(domain) and length(domain) between 3 and 253),
  opt_in            text not null default 'none'
                    check (opt_in in ('none', 'granted', 'forbidden')),
  grant_doc         jsonb,          -- last valid livery.json we saw ("grant" is a reserved word)
  grant_checked_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- kits: one row per normalised page URL.
-- ---------------------------------------------------------------------------
create table public.kits (
  id          uuid primary key default gen_random_uuid(),
  source_url  text not null unique check (source_url ~ '^https://[a-z0-9.-]+(/.*)?$'),
  domain      text not null references public.sites (domain),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  owner_id    uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index kits_domain_idx on public.kits (domain);
create index kits_owner_id_idx on public.kits (owner_id) where owner_id is not null;

-- ---------------------------------------------------------------------------
-- kit_versions: each build. version is assigned only when it is published,
-- so failed builds never leave gaps (v1, v2, v3...).
-- ---------------------------------------------------------------------------
create table public.kit_versions (
  id                 uuid primary key default gen_random_uuid(),
  kit_id             uuid not null references public.kits (id) on delete cascade,
  version            integer check (version > 0),
  extractor_version  integer not null check (extractor_version > 0),
  flow_version       integer not null check (flow_version > 0),
  status             text not null default 'building'
                     check (status in ('building', 'ready', 'failed', 'withdrawn')),
  levels             smallint[] not null default '{1,2,3}',
  data               jsonb,
  skill_md           text,
  zip_path           text,
  tar_path           text,
  manifest           jsonb,
  content_hash       text check (content_hash ~ '^[0-9a-f]{64}$'),
  grant_snapshot     jsonb,
  grant_hash         text check (grant_hash ~ '^[0-9a-f]{64}$'),
  error              text,
  build_started_at   timestamptz not null default now(),
  published_at       timestamptz,
  withdrawn_at       timestamptz,
  created_at         timestamptz not null default now(),

  unique (kit_id, version),
  check ((status in ('ready', 'withdrawn')) = (version is not null and published_at is not null)),
  check (status <> 'ready' or (skill_md is not null and content_hash is not null and data is not null)),
  check ((status = 'withdrawn') = (withdrawn_at is not null)),
  check (levels <@ '{1,2,3,4,5,6}' and cardinality(levels) > 0)
);

-- At most one build in flight per kit. This is the build lock.
create unique index kit_versions_one_build_idx on public.kit_versions (kit_id) where status = 'building';

-- Cache lookup: newest ready version for a kit and extractor version.
create index kit_versions_ready_idx on public.kit_versions (kit_id, extractor_version, version desc)
  where status = 'ready';

-- ---------------------------------------------------------------------------
-- kit_items: licence label for every font, icon set, icon and asset.
-- ---------------------------------------------------------------------------
create table public.kit_items (
  id              bigint generated always as identity primary key,
  kit_version_id  uuid not null references public.kit_versions (id) on delete cascade,
  kind            text not null check (kind in ('font', 'icon_set', 'icon', 'image', 'logo', 'illustration')),
  name            text not null check (length(name) between 1 and 200),
  source          text,
  licence         text not null check (licence in ('free', 'licence_required', 'style_only')),
  licence_name    text,
  alternative     text,
  check (licence <> 'licence_required' or alternative is not null)
);

create index kit_items_kit_version_id_idx on public.kit_items (kit_version_id);

-- ---------------------------------------------------------------------------
-- read_failures: remembered "couldn't read" results. hits doubles as the
-- outreach list of most-blocked domains.
-- ---------------------------------------------------------------------------
create table public.read_failures (
  source_url   text primary key,
  domain       text not null,
  reason       text not null check (reason in (
                 'bot_protection', 'login_required', 'empty_render', 'not_found',
                 'robots_disallowed', 'unsafe_url', 'timeout', 'sensitive_page', 'blocked_by_owner')),
  detail       text,
  retry_after  timestamptz not null,
  hits         integer not null default 1 check (hits > 0),
  first_at     timestamptz not null default now(),
  last_at      timestamptz not null default now()
);

create index read_failures_domain_idx on public.read_failures (domain);
create index read_failures_retry_after_idx on public.read_failures (retry_after);

-- ---------------------------------------------------------------------------
-- rate_limits: fixed windows. Keys are hashed (sha256(ip + secret)), never raw IPs.
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key           text not null check (length(key) between 1 and 200),
  window_start  timestamptz not null,
  count         integer not null default 0 check (count >= 0),
  primary key (key, window_start)
);

create index rate_limits_window_start_idx on public.rate_limits (window_start);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sites_touch_updated_at
  before update on public.sites
  for each row execute function private.touch_updated_at();

-- Published versions are permanent. The only change allowed is withdrawing
-- one (status -> withdrawn, artefact paths cleared). Deleting one is refused.
create function private.guard_kit_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.published_at is not null then
      raise exception 'kit version % is published; withdraw it instead of deleting', old.id
        using errcode = 'P0001';
    end if;
    return old;
  end if;

  if old.published_at is null then
    return new;
  end if;

  if old.status = 'ready'
     and new.status = 'withdrawn'
     and new.withdrawn_at is not null
     and new.zip_path is null
     and new.tar_path is null
     and (new.id, new.kit_id, new.version, new.extractor_version, new.flow_version, new.levels,
          new.data, new.skill_md, new.manifest, new.content_hash, new.grant_snapshot, new.grant_hash,
          new.error, new.build_started_at, new.published_at, new.created_at)
         is not distinct from
         (old.id, old.kit_id, old.version, old.extractor_version, old.flow_version, old.levels,
          old.data, old.skill_md, old.manifest, old.content_hash, old.grant_snapshot, old.grant_hash,
          old.error, old.build_started_at, old.published_at, old.created_at)
  then
    return new;
  end if;

  raise exception 'kit version % is published and cannot be changed', old.id
    using errcode = 'P0001';
end;
$$;

create trigger kit_versions_guard
  before update or delete on public.kit_versions
  for each row execute function private.guard_kit_version();

-- Items are frozen together with their version.
create function private.guard_kit_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target uuid := coalesce(new.kit_version_id, old.kit_version_id);
begin
  if exists (
    select 1 from public.kit_versions v
    where v.id = target and v.published_at is not null
  ) then
    raise exception 'items of published kit version % cannot be changed', target
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger kit_items_guard
  before insert or update or delete on public.kit_items
  for each row execute function private.guard_kit_item();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.sites enable row level security;
alter table public.kits enable row level security;
alter table public.kit_versions enable row level security;
alter table public.kit_items enable row level security;
alter table public.read_failures enable row level security;
alter table public.rate_limits enable row level security;

-- Clients never write, and only see what is published.
revoke all on public.sites, public.kits, public.kit_versions, public.kit_items,
              public.read_failures, public.rate_limits
  from anon, authenticated;

grant select on public.kits, public.kit_versions, public.kit_items to anon, authenticated;

create policy "Published versions are public"
  on public.kit_versions for select
  to anon, authenticated
  using (status = 'ready');

create policy "Kits with a published version are public"
  on public.kits for select
  to anon, authenticated
  using (exists (
    select 1 from public.kit_versions v
    where v.kit_id = kits.id and v.status = 'ready'
  ));

create policy "Items of published versions are public"
  on public.kit_items for select
  to anon, authenticated
  using (exists (
    select 1 from public.kit_versions v
    where v.id = kit_items.kit_version_id and v.status = 'ready'
  ));

-- sites, read_failures and rate_limits have RLS on and no policies:
-- only the service role (which bypasses RLS) can touch them.
