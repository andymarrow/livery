# Livery: master plan

Source of truth for what we build and in what order. Rules live in `CLAUDE.md` (structure + design). This file is the roadmap. Update it when a decision changes, and tick items off as they ship.

## 1. What Livery is

Livery turns a website's design into an installable **kit** (a skill) that a coding agent (Claude Code, Codex, Cursor, ...) applies to the user's own project.

- **Shortcut:** `livery.site/<any-site-url>` returns the kit. This is the main way people use it and how it's promoted.
- **Website:** `livery.site` has a beautiful input, a public library of every kit built so far, and install pages.
- **Library:** every URL anyone pastes becomes a kit in the public library (cached by URL + extractor version).
- **Audience (v1):** developers using coding agents. Designers and Figma export come later.
- **Scope (v1):** frontend / UI design psychology only. Backend skills come later. No accounts, everything free.

### Decisions locked

| Topic | Decision |
|---|---|
| Domain | `livery.site` (bought on Vercel). Replace every `livery.so` in the research notes with this. |
| Stack | Next.js App Router, TypeScript, Tailwind v4, Supabase (Postgres + Storage), Vercel |
| Browser | `playwright-core` over `connectOverCDP` to a hosted browser (Browserless), one env var `BROWSER_WS_ENDPOINT`. Move to Fly/Railway later. |
| Kit writing | No AI model. Rules, recipes and voice are written from the measurements (`lib/generate/measured.ts`); decided 2026-10-07 after Gemini's free tier failed builds. The `DesignWriter` interface allows a model later. |
| Accounts | None in v1. Rate limit by hashed IP. Library/saved kits, premium kits and paid re-scans are later. |
| Crawler identity | `LiveryBot/1.0 (+https://livery.site/bot)`. Respects robots.txt. No stealth, no proxies, no CAPTCHA solving, one try then stop. |
| Kits | A published version is **immutable**. Changes mean a new version. A version can be withdrawn (410), never edited. |

### Open points to confirm before the phase that needs them

- Browserless account/plan and region (Phase 3). Pick the region closest to our Vercel region.
- Vercel plan's `maxDuration` limit (Phase 3). Decides whether we need a job queue immediately.
- Whether the Supabase MCP points at a new empty project for Livery (Phase 0 verifies this).

## 2. Design direction (summary, full rules in `CLAUDE.md`)

Teal accent, light + dark, flat, no gradients, no colored shadows, nothing floating, lots of whitespace, subtle live interactions. References: the Krimson landing page, GoatRank, Nuzz/Rize dashboards.

Notes from the reference images, so we copy the right things:

- Copy: calm neutral surfaces, hairline-bordered rounded cards, uppercase tracked micro-labels, big confident headings, one accent used for the active state and the primary action, sidebar + right rail density for app pages.
- Do **not** copy: the floating "Start Focus" button (breaks "nothing floating"), the offset bottom-edge "3D" button look (use flat buttons), stray purple/orange/yellow accents (one accent only: teal), and the pink/purple streak banner.
- Hero idea for the landing page: one oversized input `livery.site/ [ paste a URL ]`, with a live example kit below it. The page itself should demonstrate the product.

## 3. Architecture

```
Browser or agent
  -> livery.site/<url>  (app/[...url]/route.ts)
       1. normalise + validate URL (https only, no private IPs, redirect checks)
       2. blocklist check (banks, payments, wallets, forbidden sites)
       3. cache lookup (read_failures, then kit_versions by url + extractor_version)
       4. else build: render -> guard checks -> extract -> generate -> publish
  -> agent gets text/markdown (SKILL.md or "Couldn't read this site", 422)
  -> human gets redirected to /k/{slug}/v{n} install page
```

Content negotiation on the catch-all: agents (curl, no `text/html` in `Accept`) get Markdown; browsers get a redirect to the install page or a "building" page.

### Reserved routes

Static routes beat the catch-all, but we must reserve their first segments so a site can never collide: `k`, `explore`, `owners`, `bot`, `about`, `legal`, `api`, `auth`, `_next`, `favicon.ico`, `robots.txt`, `sitemap.xml`. Keep this list in `constants/constants.ts`.

### URL map

```
/                              landing (input + featured kits)
/explore                       public library, search, filter (by icon set, accent, font, ...)
/k/{slug}/v{n}                 install page (human)
/k/{slug}/v{n}/SKILL.md        raw skill text
/k/{slug}/v{n}/kit.tar.gz      for agents
/k/{slug}/v{n}/kit.zip         for people
/k/{slug}/v{n}/manifest.json   file list + sha256 per file
/k/{slug}/latest               302 to newest (never used in prompts)
/owners                        opt-in generator, validator, takedown form
/bot                           what LiveryBot is, how to allow or block it
/<url>                         the shortcut (catch-all route handler)
```

Everything under `/k/{slug}/v{n}/` is served with `Cache-Control: public, max-age=31536000, immutable`. Withdrawn versions return 410.

### Folder layout (follows `CLAUDE.md`)

```
app/
  (HOME)/                      landing, explore, bot, about, legal
    page.tsx
    explore/ ...
    k/[slug]/v/[version]/ ...  install page (+ _components)
  (OWNERS)/owners/ ...         generator, validator, takedown
  [...url]/route.ts            the shortcut
  k/[slug]/v/[version]/{SKILL.md,kit.tar.gz,kit.zip,manifest.json}/route.ts
  actions/                     server actions (one per file)
  api/                         route handlers (health, takedown, validate-optin)
  _context/                    ThemeContext
components/ui/                 primitives
components/                    Logo, ThemeToggle, CopyButton, ...
constants/                     constants.ts, options.ts, assets.ts, reserved.ts
lib/
  browser.ts                   getBrowser() via CDP
  url/ (normalise, ssrf, blocklist)
  extract/ (render, tokens, icons, fonts, components, motion, layout)
  generate/ (gemini client, prompts, flow template, kit builder)
  guards/ (sensitive page, ngram overlap, content removal)
  supabase/ (server client, admin client)
  rateLimit.ts
services/                      kit read/write, grant fetching, storage
controllers/                   build orchestration (resolveKit, buildKit)
data/                          icon index, font metadata, denylist, fixtures manifests
supabase/migrations/           SQL migrations
tests/                         unit + guardrail fixtures + flow tests
```

## 4. Phases

Each phase ends with a **done when** check. Work on a feature branch per phase, commit locally, hand over review commands. Never push.

### Phase 0: Foundation (do first)

- [ ] Verify Supabase MCP is connected and which project it targets. (`.mcp.json` is configured, but the tools are not loaded in the session yet: needs approval/auth in Claude Code.)
- [x] Branch `chore/foundation`. Commit `CLAUDE.md` and `PLAN.md`.
- [x] Read `node_modules/next/dist/docs/` for routing, route handlers, caching, fonts (this Next.js has breaking changes).
- [x] Install (done, packaging libs `archiver`/`tar-stream` deferred to Phase 5 when used): `playwright-core`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`, `next-themes` (or minimal custom theme provider), `tar-stream`/`archiver` (zip + tar.gz), Gemini SDK.
- [x] Set up shadcn-style `components/ui` primitives (button, input, badge, card, dialog, sheet, tabs, tooltip, separator, skeleton, kbd, toaster). `command` deferred to Explore (Phase 7).
- [x] Env scaffolding: `.env.local` (ignored) + `.env.example` listing `BROWSER_WS_ENDPOINT`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `SUPABASE_*`, `IP_HASH_SECRET`, `EXTRACTOR_VERSION`.
- [x] Add scripts: `typecheck`, `test`. Set up Vitest.

**Done when:** `npm run build`, `lint` and `typecheck` pass on a clean tree; env vars documented.

### Phase 1: Design system and shell

- [x] Tokens in `app/globals.css`: neutral scale, teal accent scale, semantic colors (success/warn/danger kept muted), radii, spacing, type scale, motion durations/easings. Light + dark, both contrast-checked (AA).
- [x] Fonts: pick one UI sans + one mono (mono only for hashes, code, number columns). Load with `next/font`. Fonts must be free (OFL).
- [x] Theme: system default, toggle in navbar, no flash on load.
- [x] Layout chrome: navbar (logo, Explore, Owners, theme toggle), footer (Bot, Legal, Owners, Takedown), mobile menu.
- [x] Core components: `Logo`, `ThemeToggle`, `CopyButton` (with copied state), `CodeBlock`, `Badge` (licence labels), `Skeleton`, `EmptyState`, `Toaster`.
- [x] A hidden `/design` route (dev only) showing every component in both themes.

**Done when:** every primitive looks correct in light and dark, keyboard focus is visible, no gradient/colored-shadow/floating element anywhere.

### Phase 2: Database

Use Supabase migrations (via MCP or `supabase/migrations/`). Follow the supabase and postgres best-practice skills (RLS on every table, indexes on lookup keys, no `security definer` without a reason).

- [x] Tables: `sites`, `kits`, `kit_versions`, `kit_items`, `read_failures`, `rate_limits`. (`library` and `profiles` are added when accounts arrive.)
- [x] `sites.opt_in` is `none | granted | forbidden`, plus `grant_doc jsonb` (`grant` is a reserved word), `grant_checked_at`. `kit_versions` gets `grant_snapshot jsonb`, `grant_hash`, `flow_version`, status `building | ready | failed | withdrawn`.
- [x] Trigger: reject any `UPDATE` on `kit_versions` once `published_at` is set, except moving status to `withdrawn` (and clearing the zip path) via a dedicated function.
- [x] `bump_rate(key, window, max)` atomic function.
- [x] Unique build lock so two requests for the same URL don't build twice (insert `building` row first, handle conflict).
- [x] RLS: public read on `ready` kit_versions, kits, kit_items; everything else service-role only. Writes only from server code.
- [x] Storage buckets: `kits` (public read, no overwrite), `screenshots` (private, signed URLs).
- [ ] Generate TS types from the schema. Run the security advisors. (Hand-written types in `lib/supabase/database.types.ts` for now. Pending: apply the migrations through the Supabase MCP, then regenerate types and run advisors.)

**Done when:** advisors report no RLS gaps; permanence trigger and rate function covered by SQL tests.

### Phase 3: Safe URL intake and browser

- [x] `lib/url/normalise`: lowercase host, strip query/hash/tracking, bare domain becomes homepage, handle `https:/` collapsing that happens in paths.
- [x] `lib/url/ssrf`: https only, DNS resolve, reject private/loopback/link-local/metadata addresses, limit redirects and re-check each hop.
- [x] `lib/url/blocklist`: banks, payment providers, crypto exchanges/wallets, government services, identity pages (Apple ID, Microsoft, Google, PayPal), `.bank` TLD, plus `sites.opt_in = 'forbidden'`.
- [x] `lib/browser.ts` using `playwright-core` `connectOverCDP`.
- [x] Render at 3 widths (390, 820, 1440), wait for network idle + fonts, scroll to trigger lazy content, block analytics/ads/autoplay video.
- [x] Block detection **before** extraction, returning the typed `ReadResult`: bot protection (Cloudflare, DataDome, PerimeterX, AWS WAF, Akamai, captcha frames), login wall, empty render, not found, robots disallowed, unsafe URL, timeout, `sensitive_page`.
- [x] `read_failures` memory (24h; 1h for timeout and empty). Retry only network errors, once.
- [x] Rate limiting by hashed IP on build requests (cache hits are free and unlimited).

**Done when:** unit tests pass for SSRF and blocklist; fixtures for Cloudflare challenge, login page and empty SPA each return the right reason and nothing is extracted.

### Phase 4: Extraction (levels 1 to 3)

Mechanical and deterministic. No model here.

- [x] **Tokens:** colors (CSS variables + usage frequency + role guess: bg, surface, text, border, accent), light/dark if the site has both, type families + scale, spacing snapped to a 4px/8px grid, radii, borders, shadows, breakpoints. Cluster near-duplicates into a real scale.
- [x] **Icons:** detect via class names, iconify tags, Font Awesome kits, and drawing style (grid, stroke, linecap). Record library, package, icon names, size, stroke. (Deferred: hashing SVGs against the Iconify index; rendered paths rarely match Iconify's optimised paths byte for byte, so it needs shape-level matching.)
- [x] **Fonts:** identify family, map to Google Fonts / Fontsource, flag commercial ones with a free alternative.
- [x] **Components:** buttons, inputs, cards, nav, badges, tabs: computed styles for default, hover, focus, active, disabled. Real hover/focus via Playwright.
- [x] **Motion (level 3):** transition durations/easings, keyframes in use, scroll-triggered reveals, hover behaviors.
- [x] **Layout:** container widths, grid/column patterns, section rhythm, mobile behavior.
- [x] **Content-removed screenshots** (captured as WebP through the DevTools protocol, no image library needed; background textures averaged to their real colour): inject CSS that replaces images/video/non-icon SVG with flat average-color blocks and text with bars; keep icons, borders, radii, spacing. Save WebP, cap height.
- [x] Assign a licence label to every item: ✅ free (positively matched), 🔑 needs a licence (with ✅ alternative), 🎨 style only (default for anything unknown).

**Done when:** running on 4 to 5 real sites (including the Krimson, GoatRank and Rize references) gives sensible tokens, correct icon set, and screenshots with no copyrighted content.

### Phase 5: Kit generation

- [x] Gemini client with structured output (schema-validated JSON), retries on transient errors, token/cost logging.
- [x] Prompts that write **reasons, not just values**: rules.md ("never does X, because Y"), voice.md (analysis of tone with **new** example sentences), component recipes, do/don't list.
- [x] Image input: send the content-removed screenshots to the model for layout and psychology reading.
- [x] **Flow template** (Livery-owned, `flow_version`): steps 0 to 10 from the research notes (prepare, audit, scan project rules, report gap, ask, resolve conflicts, licences, apply one commit per area, verify, keep it, summary). Fixed text, identical in every kit. It states the login-styling exception: styling the user's own login with the kit is fine, recreating the source's login/checkout is not.
- [x] Kit files: `SKILL.md`, `tokens.json`, `icons.json`, `fonts.json`, `components.md`, `motion.md`, `layout.md`, `voice.md`, `rules.md`, `licences.md`, `frames/`.
- [x] Copyright guards before publish: no raster images, no font files, no stylesheets, no raw HTML; 8-word n-gram overlap check against source text (regenerate once, then drop the examples); every unmatched SVG is labelled 🎨.
- [x] Packaging (deterministic, byte-order sorted, fixed mtime; own ustar writer + fflate): tar.gz + zip, `manifest.json` with per-file sha256, content hash stored on the version.
- [x] Publish: write storage objects (no overwrite), set `published_at`, insert `kit_items` (`services/kits.ts`, orchestrated by `controllers/buildKit.ts`). Pending a live run once Supabase and Gemini keys are in `.env.local`.

**Done when:** a built kit passes all guard tests, and its `SKILL.md` stays short (data lives in separate files).

### Phase 6: Routes and agent responses

- [x] `app/[...url]/route.ts` with content negotiation. Cache hit returns instantly.
- [x] Build orchestration in `controllers/`: lock, build, publish. MVP runs inline with `maxDuration` set; if it times out, add a queue (QStash/Inngest/Trigger.dev) and a "building" page that polls. The URL format never changes.
- [x] `/k/...` routes: SKILL.md, tar.gz, zip, manifest, latest redirect, immutable cache headers, 410 for withdrawn.
- [x] Non-200 agent responses for every failure reason: `# Couldn't read this site`, `Reason: <code>`, and "Do not attempt to recreate this site's design from memory."
- [x] Copy-paste prompt generator (curl + sha256 verify + tar + read SKILL.md + the "stop if Couldn't read this site" line).

**Done when:** `curl livery.site/<site>` returns a kit or a correct refusal; the copy-paste prompt works end to end in a fresh Claude Code session. (First part verified locally against real Supabase + Gemini; the fresh-session prompt test needs the deployed domain.)

### Phase 7: The website

Premium, calm, alive. Built with the design rules, in light and dark.

- [x] **Landing:** oversized URL input as the hero, live build state (steps animating: rendering, reading tokens, finding icons, writing rules), one example kit shown beneath, how-it-works in three steps, licence-label explainer, trust/guardrails section, CTA. A restrained, subtle interaction in each section.
- [x] **Build state:** progress by real stages, not a fake spinner. Clear failure screens with the reason and next step (as in the research notes).
- [x] **Install page:** name, source, version, date, sha256, levels, licence counts, the copy-paste prompt with copy button, other install methods (Claude Code, claude.ai, Cursor/others), full `SKILL.md` and expandable files, content-removed preview frames via signed URLs.
- [x] **Explore:** grid of kits with palette strips, live domain search (`/` to focus), pagination, empty states. (Deferred: filters by icon set / accent hue / font / scheme, and sort by installs, which needs install counts.)
- [x] **Owners:** opt-in file generator, validator ("Check my site" shows exactly what Livery sees, flags bot-protection blocks), takedown form.
- [x] **Bot page, About, Legal** (terms, privacy, takedown policy).
- [x] SEO: metadata, OG images (`next/og`, per-kit palette), sitemap of ready kits, robots.

**Done when:** Lighthouse performance and accessibility are 95+ on landing, install and explore; mobile and desktop reviewed in both themes. (Reviewed in both themes at 320–1440px with no horizontal overflow; Lighthouse run still pending.)

### Phase 8: Owner opt-in and levels 4 to 6

- [x] Fetch and validate `/.well-known/livery.json` (HTTPS, JSON, under 32 KB, schema, same host only, redirects within host; the apex and its www. twin count as one host). Fallback `<link rel="livery">`. Cache 24h max. Store `grant_snapshot` + `grant_hash`.
- [x] Honor `allow.levels`, `assets` (no logo option), `quote_text`, `paths`, `terms` (copied to `licences.md`), `rules` (becomes `rules.md`).
- [x] `allow.levels: []` means opt-out, same as a takedown (`forbidden`).
- [x] Withdrawal: removing/narrowing the file makes new builds style-only and withdraws old versions (zip deleted, 410).
- [x] Never overridden: sensitive pages, font licences, rate limits, robots, SSRF checks.
- [x] "Owner approved" badge on kit pages and cards. (Deviation: frames stay content-removed even for opted-in sites, because a real frame would show the logo, which no grant can share.)

**Done when:** a test site with a valid file yields a level 4 to 6 kit with its own `rules.md`; removing the file withdraws it.

### Phase 9: Quality, safety, launch

- [x] **Guardrail fixtures:** saved bank homepage, Stripe-style checkout, login pages, logo-heavy landing. Assert refusals, or: no image files, no font files, no 8-word overlap, 🎨 for every unmatched SVG.
- [x] **Flow tests** (harness in `tests/flow/`, run manually with `tests/flow/run.sh <site>`; not yet run against production): 4 sample repos (Next.js + Tailwind v4, Vite + CSS modules, shadcn, plain HTML), one with a conflicting `CLAUDE.md`. Run `claude -p` with scripted answers. Assert: no edit before questions, one commit per approved area, conflicts quoted with file:line, no 🔑 item installed without confirmation. Re-run whenever `flow_version` changes.
- [ ] **Fidelity check** (deferred: needs a reference-page generator): build a reference page from a kit, screenshot, compare to the content-removed frames.
- [x] Observability: structured logs (`lib/logger`), blocked-domain counts (the outreach list), build duration and cost per kit.
- [x] Cleanup jobs (daily Vercel Cron, `/api/cron/cleanup`; also re-checks grants): stale `read_failures`, replaced screenshots after 30 days, rate-limit window pruning.
- [x] Takedown process documented (`docs/operations.md`), with `/api/admin/takedown` as the quick-response path.
- [x] Final pass: security headers, error boundaries (`error.tsx`, `global-error.tsx`), 404. Lighthouse on production build: accessibility, best practices and SEO 100 on every page; performance 94–99 (home and kit pages 94 under simulated mobile throttling).
- [ ] Domain `livery.site` connected, env vars set in Vercel, Supabase production project, Browserless region set. (Owner tasks; checklist in `docs/launch.md`. Browserless `production-sfo` verified; `vercel.json` pins `sfo1`.)

**Done when:** the whole pipeline passes on the fixture set and a real end-to-end run: paste a link, get the prompt, run it in Claude Code, see the project transformed with one commit per area.

## Levels (defined in `lib/generate/levels.ts`)

| Level | Name | Covers | Offered |
|---|---|---|---|
| 1 | Tokens | colour, type, spacing, radii, borders, depth | every site |
| 2 | Structure | component recipes, layout | every site |
| 3 | Feel | motion, voice | every site |
| 4 | Owner rules | the owner's rules document | opted-in sites |
| 5 | Owner assets | illustrations, custom icons, photos the owner allows | opted-in sites |
| 6 | Quoted copy | real sentences in voice examples | opted-in sites |

## 5. Later (not v1)

Backend/API-client skills from published OpenAPI specs, accounts and library, premium kits and payments, paid fresh re-scans, Figma export, designer audience, DNS TXT opt-in, marketplace for opted-in sites, move the renderer to Fly/Railway when Browserless costs more than a machine.

## 6. Working rules for this build

- Phase by phase, in order. Don't start a phase before the previous "done when" holds (unless we agree otherwise).
- One feature branch per phase, local commits only. Never push, never merge, never open PRs. At the end of each phase I give the branch name plus the review/diff/push commands.
- Read the Next.js docs in `node_modules/next/dist/docs/` before writing framework code.
- Every UI piece is checked in light and dark, desktop and mobile, before it counts as done.
- Guardrails are code and tests, not intentions.
