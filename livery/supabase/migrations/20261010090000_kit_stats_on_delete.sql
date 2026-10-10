-- Deleting a kit failed once anyone had viewed, liked or downloaded it:
--   23503 insert or update on table "kit_stats" violates foreign key
--   constraint "kit_stats_kit_id_fkey"
-- The kit's events go with it (on delete cascade), and the counting trigger
-- re-created the stats row for each one, for a kit that no longer exists.
-- Events removed because their kit is gone have nothing left to count.

create or replace function private.count_kit_event()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_kit uuid := coalesce(new.kit_id, old.kit_id);
  v_kind text := coalesce(new.kind, old.kind);
  v_delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.kits where id = v_kit) then
    return old;
  end if;
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
