# Operations

## Takedown requests

Requests from `/owners#takedown` land in `public.takedown_requests` (status `open`).

1. Review open requests in the Supabase table editor (`takedown_requests`, newest first).
2. To action one:

   ```
   curl -X POST https://livery.site/api/admin/takedown \
     -H "Authorization: Bearer $ADMIN_SECRET" \
     -H "content-type: application/json" \
     -d '{"domain":"example.com","requestId":12}'
   ```

   The host becomes permanently forbidden (a later livery.json can't undo it), every published version is withdrawn, its files are deleted and its links answer 410. The request is marked `actioned`.
3. Reply to the requester by email. Target: within two working days.

An owner can also opt out without us: `{"version":1, "allow":{"levels":[]}, ...}` at `/.well-known/livery.json` takes effect on the next request or the daily cron.

## Daily cron (`/api/cron/cleanup`, 04:17 UTC)

- Prunes rate-limit windows older than a day and "couldn't read" memories a week past their retry time.
- Deletes frames of withdrawn versions and of versions replaced more than 30 days ago.
- Re-checks every opted-in site's grant; a changed or removed grant withdraws versions built under it.

## The outreach list

Domains that block LiveryBot most are the owners worth asking to opt in:

```sql
select * from public.blocked_domains order by hits desc limit 50;
```

## Rebuilding kits after extraction changes

Bump `EXTRACTOR_VERSION`. Existing versions stay published; the next request for each URL builds a new version with the new extractor. Nothing is rebuilt in bulk.

## Logs

All server logs are one-line JSON (`lib/logger.ts`). Useful events: `kit.published` (with build duration), `kit.build_failed`, `grant.changed`, `withdraw.done`, `takedown.received`, `takedown.actioned`, `cron.cleanup`.
