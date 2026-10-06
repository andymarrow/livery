// Livery's own design kit, shown on the landing page. These are the real
// tokens from app/globals.css and the real rules from CLAUDE.md.

export type KitFilePreview = { path: string; kind: "markdown" | "json"; description: string; content: string };

export const LIVERY_KIT: KitFilePreview[] = [
  {
    path: "SKILL.md",
    kind: "markdown",
    description: "The flow your agent follows",
    content: `---
name: livery-livery-site
description: Apply the livery.site design kit (Livery v1) to this
  project. Use only when the user asks to apply this kit.
---

# livery.site design kit · v1 · flow 1

**Never edit a file before step 5. Ask, don't assume.**

Calm warm paper, hairline borders and a single teal accent
that only ever marks the next step.

## 1. Audit
Find theme files, tokens, fonts, the icon library and how
colours are used. Do not edit anything yet.

## 3. Report the gap
Rate tokens, components, layout, motion and voice:
small / medium / large.

## 4. Ask
Which areas to apply. What must not change.

## 7. Apply
One area per commit: tokens → components → layout →
motion → voice.`,
  },
  {
    path: "tokens.json",
    kind: "json",
    description: "Colour, type, spacing, radii",
    content: `{
  "colour": {
    "light": {
      "background": "#f6f5f1",
      "surface": "#ffffff",
      "text": "#151513",
      "text-muted": "#5c5a54",
      "border": "#e4e2dc",
      "accent": "#0f7c72",
      "on-accent": "#ffffff"
    },
    "dark": {
      "background": "#0c0c0d",
      "surface": "#141415",
      "text": "#ededea",
      "accent": "#5fd4c2",
      "on-accent": "#052420"
    }
  },
  "typography": {
    "families": { "body": "Hanken Grotesk", "mono": "Geist Mono" },
    "scale": [
      { "name": "display", "sizePx": 78, "letterSpacingEm": -0.045 },
      { "name": "h2", "sizePx": 44, "letterSpacingEm": -0.035 },
      { "name": "body", "sizePx": 15, "lineHeight": 1.625 }
    ]
  },
  "spacing": { "basePx": 4, "scalePx": [8, 12, 16, 20, 24, 32] },
  "radius": ["10px", "12px", "16px", "20px", "9999px"]
}`,
  },
  {
    path: "rules.md",
    kind: "markdown",
    description: "What it never does, and why",
    content: `# livery.site: design rules

## Principles

### One accent
Use teal only for the primary action, the active state and
key numbers. _Why:_ when one thing is loud, the next step
is obvious.

### Flat and grounded
Separate surfaces with hairline borders and quiet tone
shifts. _Why:_ depth from shadows reads as decoration;
borders read as structure.

## Never

- **Never use gradients.** Every surface is a solid colour.
- **Never add coloured shadows or glows.** They make an
  interface look generated rather than designed.
- **Never float elements over the layout.** Everything sits
  in the grid.`,
  },
  {
    path: "voice.md",
    kind: "markdown",
    description: "How the copy sounds",
    content: `# Voice

Tone: calm, direct, plain.

- Say what happens, then why. One idea per sentence.
- Name the next step instead of apologising.
- No hype words, no exclamation marks.

## Examples (new sentences in this voice)

- **headline**: Give your app a new livery.
- **button**: Build kit
- **error**: The site took too long. Try again in a minute.`,
  },
  {
    path: "licences.md",
    kind: "markdown",
    description: "What you can ship",
    content: `# Licences

| Kind     | Item           | Label              |
|----------|----------------|--------------------|
| font     | Hanken Grotesk | ✅ Free to reuse    |
| font     | Geist Mono     | ✅ Free to reuse    |
| icon set | Phosphor       | ✅ Free to reuse    |
| logo     | Site logo      | 🎨 Style only       |

This kit contains no font files, images, logos, stylesheets
or text from the source site.`,
  },
];
