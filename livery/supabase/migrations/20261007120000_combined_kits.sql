-- Combined kits: one kit built from 2-5 links instead of one.
--
--   * 'site'  : several pages of the same site. Behaves like that site's kit,
--               with more context. Has a domain, no single source_url.
--   * 'taste' : several sites chosen by one person ("Andy's taste"). Has an
--               optional curator, no domain.
--
-- Every link is first built as an ordinary 'page' kit; a combined version
-- records exactly which published page versions it was made from
-- (kit_sources), so an opt-out or takedown of any one site reaches every
-- combined kit that used it.

alter table public.kits
  add column kind         text not null default 'page' check (kind in ('page', 'site', 'taste')),
  add column sources_key  text unique check (sources_key ~ '^[0-9a-f]{64}$'),
  add column curator      text check (curator is null or (length(curator) between 1 and 40 and curator !~ '[<>\n\r]')),
  add column curator_slug text check (curator_slug is null or (curator_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(curator_slug) <= 40));

alter table public.kits alter column source_url drop not null;
alter table public.kits alter column domain drop not null;

alter table public.kits add constraint kits_kind_shape check (
  case kind
    when 'page' then source_url is not null and domain is not null and sources_key is null and curator is null
    when 'site' then source_url is null and domain is not null and sources_key is not null and curator is null
    else source_url is null and domain is null and sources_key is not null
  end
);
alter table public.kits add constraint kits_curator_pair check ((curator is null) = (curator_slug is null));

create index kits_kind_idx on public.kits (kind) where kind <> 'page';
create index kits_curator_slug_idx on public.kits (curator_slug) where curator_slug is not null;

-- Which source versions a combined build used, as one hash: a cached
-- combined kit only counts while its sources are still the newest ones.
alter table public.kit_versions add column sources_hash text check (sources_hash ~ '^[0-9a-f]{64}$');

-- ---------------------------------------------------------------------------
-- kit_sources: the page versions a combined version was made from.
-- ---------------------------------------------------------------------------
create table public.kit_sources (
  kit_version_id     uuid not null references public.kit_versions (id) on delete cascade,
  position           smallint not null check (position between 1 and 5),
  source_url         text not null check (source_url ~ '^https://[a-z0-9.-]+(/.*)?$'),
  domain             text not null references public.sites (domain),
  source_version_id  uuid not null references public.kit_versions (id),
  primary key (kit_version_id, position)
);

create index kit_sources_domain_idx on public.kit_sources (domain);
create index kit_sources_source_version_id_idx on public.kit_sources (source_version_id);

create trigger kit_sources_guard
  before insert or update or delete on public.kit_sources
  for each row execute function private.guard_kit_item();

alter table public.kit_sources enable row level security;
revoke all on public.kit_sources from anon, authenticated;
grant select on public.kit_sources to anon, authenticated;

create policy "Sources of published versions are public"
  on public.kit_sources for select
  to anon, authenticated
  using (exists (
    select 1 from public.kit_versions v
    where v.id = kit_sources.kit_version_id and v.status = 'ready'
  ));

-- The permanence guard now covers sources_hash too.
create or replace function private.guard_kit_version()
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
          new.sources_hash, new.error, new.build_started_at, new.published_at, new.created_at)
         is not distinct from
         (old.id, old.kit_id, old.version, old.extractor_version, old.flow_version, old.levels,
          old.data, old.skill_md, old.manifest, old.content_hash, old.grant_snapshot, old.grant_hash,
          old.sources_hash, old.error, old.build_started_at, old.published_at, old.created_at)
  then
    return new;
  end if;

  raise exception 'kit version % is published and cannot be changed', old.id
    using errcode = 'P0001';
end;
$$;

-- ---------------------------------------------------------------------------
-- start_combined_build: start_build for 'site' and 'taste' kits. Creates the
-- kit if needed, takes the build lock and records the sources.
-- p_sources is a JSON array of {position, source_url, domain, source_version_id};
-- each source must be a published page version.
-- ---------------------------------------------------------------------------
create function public.start_combined_build(
  p_kind text,
  p_sources_key text,
  p_domain text,
  p_slug text,
  p_curator text,
  p_curator_slug text,
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
  v_kit_id uuid;
  v_version_id uuid;
  v_count integer;
begin
  if p_kind not in ('site', 'taste') then
    raise exception 'kind % is not a combined kind', p_kind using errcode = '22023';
  end if;

  select count(*) into v_count
  from jsonb_to_recordset(p_sources) as s(position smallint, source_url text, domain text, source_version_id uuid)
  join public.kit_versions v on v.id = s.source_version_id and v.status = 'ready'
  join public.kits k on k.id = v.kit_id and k.kind = 'page' and k.source_url = s.source_url;
  if v_count < 2 or v_count <> jsonb_array_length(p_sources) then
    raise exception 'every source must be a published page kit (2 to 5)' using errcode = '22023';
  end if;

  if p_domain is not null then
    insert into public.sites (domain) values (p_domain) on conflict (domain) do nothing;
  end if;

  insert into public.kits (kind, sources_key, domain, slug, curator, curator_slug)
  values (p_kind, p_sources_key, p_domain, p_slug, p_curator, p_curator_slug)
  on conflict (sources_key) do update set sources_key = excluded.sources_key
  returning id into v_kit_id;

  update public.kit_versions v
  set status = 'failed', error = 'stale build'
  where v.kit_id = v_kit_id
    and v.status = 'building'
    and v.build_started_at < now() - p_stale_after;

  begin
    insert into public.kit_versions (kit_id, extractor_version, flow_version, sources_hash)
    values (v_kit_id, p_extractor_version, p_flow_version, p_sources_hash)
    returning id into v_version_id;
  exception when unique_violation then
    select v.id into v_version_id
    from public.kit_versions v
    where v.kit_id = v_kit_id and v.status = 'building';
    return query select v_kit_id, v_version_id, false;
    return;
  end;

  insert into public.kit_sources (kit_version_id, position, source_url, domain, source_version_id)
  select v_version_id, s.position, s.source_url, s.domain, s.source_version_id
  from jsonb_to_recordset(p_sources) as s(position smallint, source_url text, domain text, source_version_id uuid);

  return query select v_kit_id, v_version_id, true;
end;
$$;

revoke execute on function public.start_combined_build(text, text, text, text, text, text, jsonb, text, integer, integer, interval)
  from public, anon, authenticated;
grant execute on function public.start_combined_build(text, text, text, text, text, text, jsonb, text, integer, integer, interval)
  to service_role;
