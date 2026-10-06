-- Operations helpers. Server-only, like everything else that isn't a published kit.

-- The outreach list: domains that block LiveryBot most, i.e. the owners worth
-- asking to opt in. security_invoker so RLS of the caller applies.
create view public.blocked_domains
with (security_invoker = true) as
select
  domain,
  reason,
  sum(hits)::integer as hits,
  count(*)::integer as pages,
  max(last_at) as last_at
from public.read_failures
where reason in ('bot_protection', 'robots_disallowed')
group by domain, reason;

revoke all on public.blocked_domains from anon, authenticated;

-- Versions whose frames can be cleaned up: replaced by a newer version of the
-- same kit at least `p_age` ago, or withdrawn.
create function public.stale_frame_versions(p_age interval default interval '30 days')
returns table (kit_version_id uuid)
language sql
stable
set search_path = ''
as $$
  select v.id
  from public.kit_versions v
  where v.status = 'withdrawn'
     or (v.status = 'ready' and exists (
          select 1 from public.kit_versions newer
          where newer.kit_id = v.kit_id
            and newer.status = 'ready'
            and newer.version > v.version
            and newer.published_at < now() - p_age
        ));
$$;

revoke execute on function public.stale_frame_versions(interval) from public, anon, authenticated;
grant execute on function public.stale_frame_versions(interval) to service_role;
