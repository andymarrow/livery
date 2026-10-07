-- Deleting an account (the button on /me).
--
-- What goes: the person's private kit versions (and kits left with no
-- versions), the pages they measured with the extension that nothing public
-- uses, then their profile, saved kits and extension connections (those
-- cascade when the server deletes the auth user).
--
-- What stays: anything they published. Public versions are part of the
-- library; their kits lose their owner (owner_id is set null), and a measured
-- page a public version was built from stays with it, with no owner.
--
-- Published versions are normally permanent (the guard triggers refuse
-- deletes). delete_account switches those guards off for its own
-- transaction only: ALTER TABLE takes an exclusive lock, so no other session
-- sees them off, and an error rolls everything back, guards included.

-- A capture outlives its owner only when a public version uses it.
alter table public.page_captures alter column owner_id drop not null;
alter table public.page_captures drop constraint page_captures_owner_id_fkey;
alter table public.page_captures add constraint page_captures_owner_id_fkey
  foreign key (owner_id) references auth.users (id) on delete set null;

-- Returns the storage files to remove: kit archives (bucket "kits") and
-- frames (bucket "screenshots": whole version folders and capture pictures).
create function public.delete_account(p_user uuid)
returns table (kit_files text[], frame_folders text[], frame_files text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versions uuid[];
  v_kit_files text[];
  v_captures uuid[];
  v_frame_files text[];
begin
  -- Private versions of their kits that no other version is built from.
  select coalesce(array_agg(v.id), '{}') into v_versions
  from public.kit_versions v join public.kits k on k.id = v.kit_id
  where k.owner_id = p_user and v.visibility = 'private';
  select coalesce(array_agg(id), '{}') into v_versions
  from unnest(v_versions) as id
  where not exists (
    select 1 from public.kit_sources s
    where s.source_version_id = id and not (s.kit_version_id = any (v_versions))
  );

  select coalesce(array_agg(p), '{}') into v_kit_files
  from public.kit_versions v, unnest(array[v.zip_path, v.tar_path]) as p
  where v.id = any (v_versions) and p is not null;

  alter table public.kit_versions disable trigger kit_versions_guard;
  alter table public.kit_items disable trigger kit_items_guard;
  alter table public.kit_sources disable trigger kit_sources_guard;

  delete from public.kit_sources where kit_version_id = any (v_versions);
  delete from public.kit_items where kit_version_id = any (v_versions);
  delete from public.kit_versions where id = any (v_versions);

  alter table public.kit_versions enable trigger kit_versions_guard;
  alter table public.kit_items enable trigger kit_items_guard;
  alter table public.kit_sources enable trigger kit_sources_guard;

  -- Their kits with nothing left in them.
  delete from public.kits k
  where k.owner_id = p_user
    and not exists (select 1 from public.kit_versions v where v.kit_id = k.id);

  -- Their captures that nothing uses any more.
  select coalesce(array_agg(c.id), '{}'), coalesce(array_agg(c.frame_path) filter (where c.frame_path is not null), '{}')
  into v_captures, v_frame_files
  from public.page_captures c
  where c.owner_id = p_user
    and not exists (select 1 from public.kit_sources s where s.capture_id = c.id);
  delete from public.page_captures where id = any (v_captures);

  return query select v_kit_files, (select coalesce(array_agg(id::text), '{}') from unnest(v_versions) as id), v_frame_files;
end;
$$;

revoke execute on function public.delete_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_account(uuid) to service_role;
