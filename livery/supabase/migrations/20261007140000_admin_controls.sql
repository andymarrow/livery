-- Admin controls. Published versions stay permanent (agents pin them by
-- sha256); what an admin edits is the kit around them: its display name, its
-- place in the library and its cover image. Changing a taste's sources
-- publishes a new version of the same taste.

alter table public.kits
  add column display_name text check (display_name is null or length(display_name) between 1 and 80),
  add column featured     boolean not null default false,
  add column hidden       boolean not null default false,
  add column cover_path   text check (cover_path is null or cover_path ~ '^[a-z0-9-]+/[a-z0-9-]+\.(png|jpg|webp)$');

create index kits_featured_idx on public.kits (featured) where featured;

-- covers: public read, written only by the server (admin uploads).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- start_combined_version: a new version of an existing combined kit with a
-- new set of sources (an admin editing a taste). Same rules as
-- start_combined_build; the kit's sources_key moves to the new set so the
-- same links find this kit next time.
-- ---------------------------------------------------------------------------
create function public.start_combined_version(
  p_kit_id uuid,
  p_sources_key text,
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
    insert into public.kit_versions (kit_id, extractor_version, flow_version, sources_hash)
    values (p_kit_id, p_extractor_version, p_flow_version, p_sources_hash)
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

revoke execute on function public.start_combined_version(uuid, text, jsonb, text, integer, integer, interval) from public, anon, authenticated;
grant execute on function public.start_combined_version(uuid, text, jsonb, text, integer, integer, interval) to service_role;
