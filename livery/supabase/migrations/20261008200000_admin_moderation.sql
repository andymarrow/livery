-- Admin moderation: deleting a kit outright, and a record of what admins did.
--
-- admin_delete_kit removes a kit and everything under it: its versions (even
-- published ones), their items and sources, and the extension captures only
-- this kit used. Published versions are normally permanent (the guard
-- triggers refuse deletes); the guards are switched off for this transaction
-- only, as delete_account does. It refuses a kit that another kit is built
-- from (a taste or multi-page kit using one of its versions) and names those
-- kits, so the admin deletes or rebuilds them first.
--
-- admin_audit records every admin action: who can see it is the service
-- role only.

create table public.admin_audit (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  action  text not null check (length(action) between 1 and 60),
  target  text check (length(target) <= 200),
  detail  jsonb not null default '{}'::jsonb
);

create index admin_audit_at_idx on public.admin_audit (at desc);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;

create function public.admin_delete_kit(p_kit_id uuid)
returns table (kit_files text[], frame_folders text[], frame_files text[], cover text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versions uuid[];
  v_users text;
  v_captures uuid[];
  v_kit_files text[];
  v_frame_files text[];
  v_cover text;
begin
  if not exists (select 1 from public.kits where id = p_kit_id) then
    raise exception 'kit % not found', p_kit_id using errcode = 'P0002';
  end if;

  select coalesce(array_agg(v.id), '{}') into v_versions from public.kit_versions v where v.kit_id = p_kit_id;

  select string_agg(distinct k.slug, ', ') into v_users
  from public.kit_sources s
  join public.kit_versions v on v.id = s.kit_version_id
  join public.kits k on k.id = v.kit_id
  where s.source_version_id = any (v_versions) and v.kit_id <> p_kit_id;
  if v_users is not null then
    raise exception 'kit is used by %', v_users using errcode = 'P0001', hint = 'kit_in_use';
  end if;

  select coalesce(array_agg(distinct s.capture_id) filter (where s.capture_id is not null), '{}') into v_captures
  from public.kit_sources s where s.kit_version_id = any (v_versions);

  select coalesce(array_agg(p), '{}') into v_kit_files
  from public.kit_versions v, unnest(array[v.zip_path, v.tar_path]) as p
  where v.id = any (v_versions) and p is not null;

  select cover_path into v_cover from public.kits where id = p_kit_id;

  alter table public.kit_versions disable trigger kit_versions_guard;
  alter table public.kit_items disable trigger kit_items_guard;
  alter table public.kit_sources disable trigger kit_sources_guard;

  delete from public.kit_sources where kit_version_id = any (v_versions);
  delete from public.kit_items where kit_version_id = any (v_versions);
  delete from public.kit_versions where id = any (v_versions);

  alter table public.kit_versions enable trigger kit_versions_guard;
  alter table public.kit_items enable trigger kit_items_guard;
  alter table public.kit_sources enable trigger kit_sources_guard;

  delete from public.kits where id = p_kit_id;

  -- Captures nothing else uses go with it.
  select coalesce(array_agg(c.frame_path) filter (where c.frame_path is not null), '{}') into v_frame_files
  from public.page_captures c
  where c.id = any (v_captures) and not exists (select 1 from public.kit_sources s where s.capture_id = c.id);
  delete from public.page_captures c
  where c.id = any (v_captures) and not exists (select 1 from public.kit_sources s where s.capture_id = c.id);

  return query select v_kit_files, (select coalesce(array_agg(id::text), '{}') from unnest(v_versions) as id), v_frame_files, v_cover;
end;
$$;

revoke execute on function public.admin_delete_kit(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_kit(uuid) to service_role;
