# Launch checklist

Everything Livery needs to run on livery.site. Work top to bottom.

## 1. Supabase (production project)

Run every file in `supabase/migrations/` in order, in the SQL editor (or with the Supabase CLI):

1. `20261006120000_core_schema.sql`
2. `20261006120100_build_functions.sql`
3. `20261006120200_storage_buckets.sql`
4. `20261006130000_takedown_requests.sql`
5. `20261006140000_operations.sql`

Then in Database → Advisors, run the security advisor and confirm it reports no RLS gaps.

## 2. Browserless

Use the WebSocket root with your token, not a REST endpoint:

```
BROWSER_WS_ENDPOINT=wss://production-sfo.browserless.io?token=YOUR_TOKEN
```

The app also accepts the `https://…/screenshot?token=` form and converts it. `vercel.json` pins functions to `sfo1` so they sit next to Browserless's `production-sfo` region; every browser command is a round trip, so keep the two in the same region.

## 3. Vercel

- Import the repository; set the root directory to `livery/`.
- Plan: a first build renders a site three times (20–40s), so routes set `maxDuration = 300`. Use a plan that allows long functions (Pro or above, or Fluid compute).
- Domain: add `livery.site` (and redirect `www.livery.site` to it).
- Environment variables (Production):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (server only) |
| `BROWSER_WS_ENDPOINT` | see above |
| `IP_HASH_SECRET` | long random string (`openssl rand -hex 32`) |
| `CRON_SECRET` | long random string; Vercel Cron sends it automatically |
| `ADMIN_SECRET` | long random string, for takedowns |
| `EXTRACTOR_VERSION` | `1` (bump to rebuild kits after extraction changes) |

## 4. Smoke test after deploy

```
curl -s -H "Accept: text/markdown" https://livery.site/rize.roggy.site | head -20   # a kit
curl -s -o /dev/null -w "%{http_code}\n" -H "Accept: text/markdown" https://livery.site/chase.com   # 422
curl -s -H "Authorization: Bearer $CRON_SECRET" https://livery.site/api/cron/cleanup   # JSON report
```

Then paste the install prompt from a kit page into a fresh Claude Code session in a throwaway repo, and run `tests/flow/run.sh <site>` against production.
