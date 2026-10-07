-- kit_library: one row per kit, its newest published version plus its
-- totals. The library lists and sorts this (by date, likes, downloads or
-- views) instead of every version. security_invoker keeps the callers' RLS.

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
