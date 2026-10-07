# goatrank.lol: design rules

A dark interface on a near-black neutral background where an orange accent marks the next step. Type is Inter set tight at large sizes, corners are fully rounded on controls, and depth comes from soft neutral shadows.

## Principles

### One accent, used sparingly

Reserve the orange accent (#ff7a00) for primary actions, links and active states.

_Why:_ It covers only 0.6% of the measured page, so wherever it appears it reads as the next step.

### Soft, neutral depth

Lift raised elements with the measured shadow (rgba(0, 0, 0, 0.05) 0px 1px 2px 0px).

_Why:_ Shadows appear on about 9% of elements; they mark what floats above the page and are never tinted.

### Big type, quiet body

Pair 36px headings with 14px body text in Inter.

_Why:_ A 2.6× jump between headline and body creates strong hierarchy with few elements.

### A steady rhythm

Space everything on the 4px grid: 2, 4, 8, 12, 16, 20, 32px.

_Why:_ 72% of measured spacing values fall on this grid, which is what makes the layout feel ordered.

### Rounded and approachable

Use pill shapes for buttons and chips, and 14px corners for containers.

_Why:_ Fully rounded shapes make up 48% of measured radii; they soften an otherwise structured page.

## Never

- **Never tint shadows with colour.** Every measured shadow is neutral; a coloured glow would read as a different product.
- **Never introduce a second accent colour.** Only one saturated colour (#ff7a00) carries weight in the measured palette.
- **Never use positive letter-spacing on headings.** Large type is tightened, down to -0.025em on the biggest sizes.
- **Never square off buttons.** Measured buttons are fully rounded; square ones would break the shape language.
- **Never set button labels in all capitals.** No measured button uses uppercase text.
- **Never mix in a second display typeface.** Headings and body share Inter; a second family would split the voice.
- **Never use spacing off the 4px grid.** 72% of measured spacing sits on it.

## Colour

- Dark theme: near-black neutral background (#030303) with #0a0a0c surfaces.
- Body text #fafafa on the background reads at 19.8:1; secondary text uses #a1a1a1.
- Accent #ff7a00 (orange) with #030303 text on top of it.
- A light theme also exists: #f4f3ed background, #111111 text; tokens.json lists both.

## Typography

- Inter throughout, ui-monospace for code.
- Scale: h1 36px, h2 30px, h3 24px, h4 18px, h5 16px, body 14px, small 12px.
- Weights in use: 400, 500, 600.
- Headings are tightened (-0.025em at 36px); body text keeps normal tracking.

## Shape and depth

- Radii: 10px (15%), 14px (18%), 18px (17%), pill (48%).
- Borders: 1px in #111112.
- Shadows: rgba(0, 0, 0, 0.05) 0px 1px 2px 0px | rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1… | rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -….
