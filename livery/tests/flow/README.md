# Flow tests

Four small projects with different styling setups, used to check that every
kit's SKILL.md flow behaves: it asks before editing, commits one area at a
time, respects project rules and never installs licensed items unasked.

| Repo | Setup | Notes |
|---|---|---|
| `next-tailwind4` | Next.js + Tailwind v4 `@theme` | Has a conflicting `CLAUDE.md` (blue brand colour) |
| `vite-css-modules` | Vite + CSS modules | Coloured shadow to be removed by most kits |
| `shadcn` | shadcn/ui CSS variables (oklch) | Light and dark variables |
| `plain-html` | Plain HTML + CSS | A gradient header |

Run against a published kit (needs the `claude` CLI; costs model calls):

```
tests/flow/run.sh rize.roggy.site
LIVERY_BASE=http://localhost:3000 tests/flow/run.sh rize.roggy.site shadcn
```

Re-run whenever `FLOW_VERSION` changes.
