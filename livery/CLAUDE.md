@AGENTS.md

# What this project is

Livery (`livery.site`) turns any public website's design into an installable agent skill (a "kit"). Frontend/UI only for v1, no accounts, Supabase + Next.js + Gemini. **The roadmap and all product decisions live in `PLAN.md`: read it before starting work and follow its phase order.**

# Project structure rules (always follow)

These come from the owner's standard way of building Next.js App Router apps (reference: their older `github-link` project). Apply them to every feature, page and component in this repo.

## Top-level layout

```
app/                  routes, route groups, server actions, API routes, context
components/           shared, app-wide components only
components/ui/        shadcn-style primitives (button, dialog, input, tabs, ...)
constants/            assets.js, constants.js, options.js (static values, option lists)
controllers/          business logic
services/             external/data access logic
data/                 mock/seed data
lib/                  clients and helpers (supabaseClient, logger, utils, validations, ...)
utils/                small helpers; utils/supabase/server.js for the server client
supabase/functions/   edge functions
public/               static assets
middleware           at the project root
```

## Inside `app/`

- **Route groups in UPPERCASE parentheses**, one per area of the product: `(ADMIN)`, `(AUTH)`, `(HOME)`. Each group has its own `layout`.
- **`app/actions/`** holds all server actions, one file per action, named in camelCase after what it does (`createEvent.js`, `moveSubmission.js`, `getFeed.js`).
- **`app/api/`** holds route handlers, one folder per resource with a `route` file.
- **`app/_context/`** holds React context providers (e.g. `AuthContext`).
- Root-level `error`, `loading`, `not-found`, `globals.css`, `layout`, `robots`, `sitemap` live directly in `app/`.

## Colocation: `_components/` next to the route

- Each route folder keeps the components it alone uses in its own `_components/` folder, next to its `page`.
- A `page` file stays thin: it fetches/composes and hands off to components. Interactive pieces go in a `*Client` component inside `_components/` (e.g. `ProfileClient`, `ContestClient`, `DashboardClient`).
- Nest as deep as the route does: a nested route gets its own `_components/` rather than reaching up into a parent's.
- Big features split into tab/section components (`OverviewTab`, `SettingsTab`, `ModalHeader`, `ModalFooter`, ...) rather than one giant file.
- Group of related components inside `_components/` may get a subfolder (e.g. `feed/`, `live/`, `legal/`).
- Promote a component to the top-level `components/` only when it is genuinely shared across route groups. Otherwise keep it colocated.
- Group-wide shared pieces (navbar, sidebar, guards, tables) go in that group's own `_components/` at the group's level (e.g. `(ADMIN)/admin/_components/`, `(HOME)/_components/`).

## Naming

- Component files: **PascalCase** (`AdminSidebar`, `ProjectCard`).
- Non-component files (actions, helpers, constants): **camelCase**.
- Route folders: lowercase, kebab-case where multi-word (`forgot-password`, `update-password`). Dynamic segments in brackets (`[slug]`, `[id]`, `[username]`).
- Guards are named `*Guard` (`AdminGuard`, `DashboardGuard`); modals `*Modal`; dialogs `*Dialog`.

## Language note

The reference project used `.js`/`.jsx`. This repo was scaffolded with TypeScript (`.ts`/`.tsx`), so use TypeScript extensions here unless the owner says otherwise. The folder structure and naming above apply either way.

# Design rules (always follow)

Inspiration: rize.roggy.site, goatrank.lol, and the owner's reference screenshots (a light marketing page, a light app with cards, a dark focus-tracker dashboard). Study the traits below, don't copy those sites.

## Look and feel

- **Light and dark themes, always.** Every component must look right in both. Use CSS variable design tokens, not hardcoded colors.
- **Accent color: Teal.** One accent, used with restraint: primary buttons, active nav state, key numbers, progress, links. Neutrals do the rest.
- **Clean, modern, simple, with space to breathe.** Generous padding and whitespace, clear hierarchy, few elements per section. Calm warm/neutral surfaces in light, near-black surfaces in dark.
- **Flat and grounded.** Use hairline borders, rounded cards, and subtle surface contrast to separate things.
- **Minor interactions make it feel alive:** hover/press states, small transitions, count-ups, live indicators, smooth tab and carousel changes. Subtle and fast. Respect `prefers-reduced-motion`.
- **Every section and interaction should feel like a breath of fresh air:** simple, with one creative touch, so the target audience says "wow". Don't ship generic template layouts.

## Hard bans (these make a site look vibe-coded)

- **No floating elements.** Nothing hovering over the layout, no detached drifting cards, no decorative levitation.
- **No colored shadows.** No glow, no tinted or accent-colored `box-shadow`. If a shadow is ever needed, it is neutral and barely visible. Prefer borders.
- **No gradients.** Not on backgrounds, buttons, text, borders or cards. Solid colors only.

## Quality bar

- Work like a senior UI/UX designer and developer: obsessive attention to detail (alignment, spacing rhythm, type scale, radii, states, empty/loading/error states), best-in-class UX, strong performance (server components by default, minimal client JS, optimized images/fonts, no layout shift) and real functionality, not placeholders.
- Responsive from phone to wide desktop. Accessible: contrast in both themes, visible focus, keyboard support, semantic HTML.
- More context and rules will be added over time. Treat this file as the source of truth and update it when the owner gives new standing rules.

## Commands

- `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`
- `npm test`: unit, guardrail fixtures (real Chrome if installed) and database tests (embedded Postgres via PGlite, with Supabase roles stubbed)
- `LIVE=1 npx vitest run tests/live`: opt-in smoke test against real websites
- `node scripts/contrast.mjs`: WCAG contrast of the theme tokens
- Database changes go in `supabase/migrations/` as new timestamped files, are covered by `tests/db`, then applied through the Supabase MCP.

## Reminders

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (see `AGENTS.md`); this Next.js version has breaking changes.
- Global git rules in `~/.claude/CLAUDE.md` still apply: never push, never commit to `main`, work on a branch.
