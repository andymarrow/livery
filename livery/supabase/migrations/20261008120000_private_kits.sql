-- Ownership and private kits.
--
-- Kits built while signed in belong to that person (owner_id, first build
-- only; rebuilds never change it). Each version is public or private:
-- private versions (those containing pages measured behind a login) never
-- appear in the library and are readable only by their owner, or by an agent
-- holding the version's private_key. Publishing is one-way, private -> public.

alter table public.kit_versions
  add column visibility  text not null default 'public' check (visibility in ('public', 'private')),
  add column private_key text unique check (private_key ~ '^[0-9a-f]{32}$');

alter table public.kit_versions add constraint kit_versions_private_key_shape
  check ((visibility = 'private') = (private_key is not null) or visibility = 'public');

create index kit_versions_private_idx on public.kit_versions (kit_id) where visibility = 'private';

-- A fresh secret for a private version (none for public ones).
create function private.new_private_key(p_visibility text)
returns text
language sql
volatile
set search_path = ''
as $$
  select case when p_visibility = 'private' then replace(gen_random_uuid()::text, '-', '') else null end;
$$;

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

  -- Publishing: a private version becomes public, nothing else changes.
  if old.status = 'ready' and new.status = 'ready'
     and old.visibility = 'private' and new.visibility = 'public'
     and (new.id, new.kit_id, new.version, new.extractor_version, new.flow_version, new.levels,
          new.data, new.skill_md, new.zip_path, new.tar_path, new.manifest, new.content_hash,
          new.grant_snapshot, new.grant_hash, new.sources_hash, new.private_key, new.error,
          new.build_started_at, new.published_at, new.withdrawn_at, new.created_at)
         is not distinct from
         (old.id, old.kit_id, old.version, old.extractor_version, old.flow_version, old.levels,
          old.data, old.skill_md, old.zip_path, old.tar_path, old.manifest, old.content_hash,
          old.grant_snapshot, old.grant_hash, old.sources_hash, old.private_key, old.error,
          old.build_started_at, old.published_at, old.withdrawn_at, old.created_at)
  then
    return new;
  end if;

  if old.status = 'ready'
     and new.status = 'withdrawn'
     and new.withdrawn_at is not null
     and new.zip_path is null
     and new.tar_path is null
     and (new.id, new.kit_id, new.version, new.extractor_version, new.flow_version, new.levels,
          new.data, new.skill_md, new.manifest, new.content_hash, new.grant_snapshot, new.grant_hash,
          new.sources_hash, new.visibility, new.private_key, new.error, new.build_started_at, new.published_at, new.created_at)
         is not distinct from
         (old.id, old.kit_id, old.version, old.extractor_version, old.flow_version, old.levels,
          old.data, old.skill_md, old.manifest, old.content_hash, old.grant_snapshot, old.grant_hash,
          old.sources_hash, old.visibility, old.private_key, old.error, old.build_started_at, old.published_at, old.created_at)
  then
    return new;
  end if;

  raise exception 'kit version % is published and cannot be changed', old.id
    using errcode = 'P0001';
end;
$$;

-- Who can read what: public published versions for everyone; the owner also
-- sees their private ones. The service role (server code) bypasses RLS and
-- enforces the same rule itself.
create function private.owns_kit(p_kit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.kits k where k.id = p_kit_id and k.owner_id = (select auth.uid()) and k.owner_id is not null);
$$;

drop policy "Published versions are public" on public.kit_versions;
create policy "Published versions are public; private ones to their owner"
  on public.kit_versions for select
  to anon, authenticated
  using (status = 'ready' and (visibility = 'public' or private.owns_kit(kit_id)));

drop policy "Kits with a published version are public" on public.kits;
create policy "Kits with a visible published version"
  on public.kits for select
  to anon, authenticated
  using (exists (
    select 1 from public.kit_versions v
    where v.kit_id = kits.id and v.status = 'ready' and (v.visibility = 'public' or kits.owner_id = (select auth.uid()))
  ));

drop policy "Items of published versions are public" on public.kit_items;
create policy "Items of visible published versions"
  on public.kit_items for select
  to anon, authenticated
  using (exists (
    select 1 from public.kit_versions v
    where v.id = kit_items.kit_version_id and v.status = 'ready' and (v.visibility = 'public' or private.owns_kit(v.kit_id))
  ));

drop policy "Sources of published versions are public" on public.kit_sources;
create policy "Sources of visible published versions"
  on public.kit_sources for select
  to anon, authenticated
  using (exists (
    select 1 from public.kit_versions v
    where v.id = kit_sources.kit_version_id and v.status = 'ready' and (v.visibility = 'public' or private.owns_kit(v.kit_id))
  ));

drop policy "Stats of published kits are public" on public.kit_stats;
create policy "Stats of kits with a public version"
  on public.kit_stats for select
  to anon, authenticated
  using (exists (select 1 from public.kit_versions v where v.kit_id = kit_stats.kit_id and v.status = 'ready' and v.visibility = 'public'));

grant execute on function private.owns_kit(uuid) to anon, authenticated;

-- The library only ever lists public versions, whoever asks.
create or replace view public.kit_library with (security_invoker = true) as
select distinct on (v.kit_id)
  v.id, v.kit_id, v.version, v.published_at, v.data, v.grant_hash,
  coalesce(s.views, 0) as views,
  coalesce(s.likes, 0) as likes,
  coalesce(s.downloads, 0) as downloads,
  v.data -> 'extraction' -> 'tokens' -> 'palette' ->> 'scheme' as scheme,
  v.data -> 'extraction' -> 'tokens' -> 'palette' ->> 'accent' as accent,
  case
    when (v.data -> 'extraction' -> 'tokens' -> 'palette' ->> 'monochrome')::boolean then 'neutral'
    else coalesce(public.colour_family(v.data -> 'extraction' -> 'tokens' -> 'palette' ->> 'accent'), 'neutral')
  end as colour,
  v.data -> 'extraction' -> 'tokens' -> 'typography' -> 'families' ->> 'display' as font,
  v.data -> 'extraction' -> 'icons' -> 'library' ->> 'name' as icon_set
from public.kit_versions v
left join public.kit_stats s on s.kit_id = v.kit_id
where v.status = 'ready' and v.visibility = 'public'
order by v.kit_id, v.version desc;

-- Build functions learn the owner (and, for combined kits, the visibility).
drop function public.start_build(text, text, text, integer, integer, interval);
drop function public.start_combined_build(text, text, text, text, text, text, jsonb, text, integer, integer, interval);
drop function public.start_combined_version(uuid, text, jsonb, text, integer, integer, interval);

create function public.start_build(
  p_source_url text,
  p_domain text,
  p_slug text,
  p_extractor_version integer,
  p_flow_version integer,
  p_stale_after interval default interval '10 minutes',
  p_owner uuid default null
)
returns table (kit_id uuid, kit_version_id uuid, claimed boolean)
language plpgsql
set search_path = ''
as $$
declare
  v_kit_id uuid;
  v_version_id uuid;
begin
  insert into public.sites (domain) values (p_domain)
  on conflict (domain) do nothing;

  insert into public.kits (source_url, domain, slug, owner_id)
  values (p_source_url, p_domain, p_slug, p_owner)
  on conflict (source_url) do update set source_url = excluded.source_url
  returning id into v_kit_id;

  update public.kit_versions v
  set status = 'failed', error = 'stale build'
  where v.kit_id = v_kit_id
    and v.status = 'building'
    and v.build_started_at < now() - p_stale_after;

  begin
    insert into public.kit_versions (kit_id, extractor_version, flow_version)
    values (v_kit_id, p_extractor_version, p_flow_version)
    returning id into v_version_id;
  exception when unique_violation then
    select v.id into v_version_id
    from public.kit_versions v
    where v.kit_id = v_kit_id and v.status = 'building';
    return query select v_kit_id, v_version_id, false;
    return;
  end;

  return query select v_kit_id, v_version_id, true;
end;
$$;

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
  p_stale_after interval default interval '10 minutes',
  p_owner uuid default null,
  p_visibility text default 'public'
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

  insert into public.kits (kind, sources_key, domain, slug, curator, curator_slug, owner_id)
  values (p_kind, p_sources_key, p_domain, p_slug, p_curator, p_curator_slug, p_owner)
  on conflict (sources_key) do update set sources_key = excluded.sources_key
  returning id into v_kit_id;

  update public.kit_versions v
  set status = 'failed', error = 'stale build'
  where v.kit_id = v_kit_id
    and v.status = 'building'
    and v.build_started_at < now() - p_stale_after;

  begin
    insert into public.kit_versions (kit_id, extractor_version, flow_version, sources_hash, visibility, private_key)
    values (v_kit_id, p_extractor_version, p_flow_version, p_sources_hash, p_visibility, private.new_private_key(p_visibility))
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

create function public.start_combined_version(
  p_kit_id uuid,
  p_sources_key text,
  p_sources jsonb,
  p_sources_hash text,
  p_extractor_version integer,
  p_flow_version integer,
  p_stale_after interval default interval '10 minutes',
  p_visibility text default 'public'
)
returns table (kit_id uuid, kit_version_id uuid, claimed boolean)
language plpgsql
set search_path = ''
as $$
declare
  v_kind text;
  v_version_id uuid;
  v_count integer;
begin
  select k.kind into v_kind from public.kits k where k.id = p_kit_id for update;
  if v_kind is null or v_kind not in ('site', 'taste') then
    raise exception 'kit % is not a combined kit', p_kit_id using errcode = '22023';
  end if;

  select count(*) into v_count
  from jsonb_to_recordset(p_sources) as s(position smallint, source_url text, domain text, source_version_id uuid)
  join public.kit_versions v on v.id = s.source_version_id and v.status = 'ready'
  join public.kits k on k.id = v.kit_id and k.kind = 'page' and k.source_url = s.source_url;
  if v_count < 2 or v_count <> jsonb_array_length(p_sources) then
    raise exception 'every source must be a published page kit (2 to 5)' using errcode = '22023';
  end if;

  if exists (select 1 from public.kits k where k.sources_key = p_sources_key and k.id <> p_kit_id) then
    raise exception 'another kit already combines exactly these links' using errcode = '23505';
  end if;
  update public.kits set sources_key = p_sources_key where id = p_kit_id;

  update public.kit_versions v
  set status = 'failed', error = 'stale build'
  where v.kit_id = p_kit_id and v.status = 'building' and v.build_started_at < now() - p_stale_after;

  begin
    insert into public.kit_versions (kit_id, extractor_version, flow_version, sources_hash, visibility, private_key)
    values (p_kit_id, p_extractor_version, p_flow_version, p_sources_hash, p_visibility, private.new_private_key(p_visibility))
    returning id into v_version_id;
  exception when unique_violation then
    select v.id into v_version_id from public.kit_versions v where v.kit_id = p_kit_id and v.status = 'building';
    return query select p_kit_id, v_version_id, false;
    return;
  end;

  insert into public.kit_sources (kit_version_id, position, source_url, domain, source_version_id)
  select v_version_id, s.position, s.source_url, s.domain, s.source_version_id
  from jsonb_to_recordset(p_sources) as s(position smallint, source_url text, domain text, source_version_id uuid);

  return query select p_kit_id, v_version_id, true;
end;
$$;

revoke execute on function
  public.start_build(text, text, text, integer, integer, interval, uuid),
  public.start_combined_build(text, text, text, text, text, text, jsonb, text, integer, integer, interval, uuid, text),
  public.start_combined_version(uuid, text, jsonb, text, integer, integer, interval, text)
  from public, anon, authenticated;
grant execute on function
  public.start_build(text, text, text, integer, integer, interval, uuid),
  public.start_combined_build(text, text, text, text, text, text, jsonb, text, integer, integer, interval, uuid, text),
  public.start_combined_version(uuid, text, jsonb, text, integer, integer, interval, text)
  to service_role;
