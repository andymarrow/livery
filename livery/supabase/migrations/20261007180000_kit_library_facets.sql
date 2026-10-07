-- Facets the library filters on (theme, accent colour family, typeface, icon
-- set), as columns of kit_library so filtering, counts and paging run in the
-- database. Columns are appended, so the view is replaced in place.

-- A hex colour's family, by hue, for filtering ("blue", "orange", "neutral").
create function public.colour_family(p_hex text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  r numeric; g numeric; b numeric; mx numeric; mn numeric; d numeric; h numeric;
begin
  if p_hex is null or p_hex !~* '^#[0-9a-f]{6}' then return null; end if;
  r := ('x' || substr(p_hex, 2, 2))::bit(8)::int / 255.0;
  g := ('x' || substr(p_hex, 4, 2))::bit(8)::int / 255.0;
  b := ('x' || substr(p_hex, 6, 2))::bit(8)::int / 255.0;
  mx := greatest(r, g, b); mn := least(r, g, b); d := mx - mn;
  if d < 0.12 then return 'neutral'; end if;
  if mx = r then h := 60 * (((g - b) / d) % 6);
  elsif mx = g then h := 60 * ((b - r) / d + 2);
  else h := 60 * ((r - g) / d + 4);
  end if;
  if h < 0 then h := h + 360; end if;
  return case
    when h < 15 then 'red' when h < 45 then 'orange' when h < 70 then 'yellow'
    when h < 165 then 'green' when h < 200 then 'teal' when h < 255 then 'blue'
    when h < 290 then 'purple' when h < 335 then 'pink' else 'red' end;
end;
$$;

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
where v.status = 'ready'
order by v.kit_id, v.version desc;

grant select on public.kit_library to anon, authenticated;
grant execute on function public.colour_family(text) to anon, authenticated, service_role;
