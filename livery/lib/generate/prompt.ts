import type { Extraction } from "@/lib/extract";

// A compact, model-friendly digest of the measurements. Raw CSS, URLs of
// assets and the site's markup never go to the model, only extracted values.
export function digest(extraction: Extraction) {
  const { tokens, fonts, icons, components, imagery } = extraction;
  return {
    palette: tokens.palette,
    alternatePalette: tokens.alternatePalette,
    typography: {
      families: tokens.typography.families,
      scale: tokens.typography.scale.map(({ name, sizePx, weight, lineHeight, letterSpacingEm }) => ({ name, sizePx, weight, lineHeight, letterSpacingEm })),
      weights: tokens.typography.weights,
    },
    spacing: tokens.spacing,
    radii: tokens.radii,
    shadows: tokens.shadows,
    borderWidths: tokens.borderWidths,
    breakpoints: tokens.breakpoints,
    layout: tokens.layout,
    motion: { durationsMs: tokens.motion.durationsMs, easings: tokens.motion.easings, properties: tokens.motion.properties, keyframes: tokens.motion.keyframes.map((k) => k.name) },
    fonts: fonts.map(({ family, roles, licence, alternative }) => ({ family, roles, licence, alternative })),
    icons: { library: icons.library?.name ?? null, style: icons.style, customCount: icons.customCount },
    components: components.map(({ kind, count, style, hover, focus }) => ({ kind, count, style, hover, focus })),
    imagery,
  };
}

export function buildPrompt(extraction: Extraction, options: { avoidPhrases?: string[] } = {}) {
  const host = new URL(extraction.source.finalUrl).hostname.replace(/^www\./, "");
  const sample = (list: string[], n: number) => list.slice(0, n).map((t) => `- ${t.slice(0, 220)}`).join("\n") || "- (none)";

  return `You are a senior product designer writing a design system brief for a coding agent.
The agent will restyle a DIFFERENT project to feel like ${host}. It needs the reasoning behind the design, not only values.

You receive:
1. MEASUREMENTS: values extracted from the rendered site at 390, 820 and 1440 px. They are the source of truth.
2. FRAMES: screenshots with the content removed (grey blocks were images, bars were text) showing layout, rhythm and colour.
3. SITE TEXT: a sample of the site's copy, ONLY so you can describe its voice.

Rules for what you write:
- Ground every claim in the measurements or frames. Never invent values; refer to tokens by role (accent, surface, body size) and quote numbers from the measurements.
- Write rules an agent can act on, in the imperative ("Use…", "Keep…", "Never…"). Each "why" explains the effect on the person using the product.
- "never" lists real restraints visible in the data (for example: no shadows measured, one accent only, no gradients, tight letter-spacing only on large type). Do not list generic advice.
- Components: describe recipes for the measured variants only, including their measured hover/focus changes.
- Imagery: describe treatment (radius, framing, density) without describing specific photos, logos or illustrations.
- Voice: describe tone and rules. Examples must be NEW sentences you write for a generic product. Never copy, quote or closely paraphrase the site text${options.avoidPhrases?.length ? `. In particular, do not reuse these phrases: ${options.avoidPhrases.map((p) => `"${p}"`).join(", ")}` : ""}.
- Never mention ${host}'s brand name, product names or people inside rules or examples.
- Plain, direct English. No hype words.

MEASUREMENTS (JSON):
${JSON.stringify(digest(extraction))}

SITE TEXT (for voice analysis only, do not reuse):
Headings:
${sample(extraction.text.headings, 14)}
Paragraphs:
${sample(extraction.text.paragraphs, 10)}
Buttons and actions:
${sample(extraction.text.actions, 14)}
`;
}
