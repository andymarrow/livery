import type { Extraction } from "@/lib/extract";
import type { Analysis } from "./analysis";
import type { KitSource } from "./kit";

// Each kit file, rendered deterministically from measurements (values) and
// the analysis (reasons). Markdown stays plain so any agent can read it.

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");
const px = (n: number | null | undefined) => (n == null ? "n/a" : `${n}px`);

export function tokensJson(e: Extraction, sources?: KitSource[]) {
  const { palette, alternatePalette, typography, spacing, radii, shadows, borderWidths, breakpoints, layout, motion } = e.tokens;
  const colourRoles = (p: typeof palette) => ({
    scheme: p.scheme,
    background: p.background,
    surface: p.surface,
    "surface-alt": p.surfaceAlt,
    text: p.text,
    "text-muted": p.textMuted,
    border: p.border,
    accent: p.accent,
    "on-accent": p.onAccent,
    monochrome: p.monochrome,
    swatches: p.swatches,
  });
  return JSON.stringify(
    {
      $schema: "https://livery.site/schema/tokens-v1.json",
      source: { url: e.source.url, extractedAt: e.source.extractedAt, extractorVersion: e.source.extractorVersion },
      ...(sources?.length ? { sources: sources.map((s) => ({ url: s.url, kit: `${s.slug}/v${s.version}` })) } : {}),
      colour: { [palette.scheme]: colourRoles(palette), ...(alternatePalette ? { [alternatePalette.scheme]: colourRoles(alternatePalette) } : {}) },
      typography: {
        families: { body: typography.families.body, display: typography.families.display, mono: typography.families.mono },
        scale: typography.scale.map(({ name, sizePx, weight, lineHeight, letterSpacingEm }) => ({ name, sizePx, weight, lineHeight, letterSpacingEm })),
        weights: typography.weights,
      },
      spacing: { basePx: spacing.base, scalePx: spacing.values },
      radius: radii.map((r) => ({ value: r.px === "pill" ? "9999px" : `${r.px}px`, share: r.share })),
      shadow: shadows.map((s) => ({ value: s.value, tinted: s.tinted })),
      borderWidths,
      breakpointsPx: breakpoints,
      layout,
      motion: {
        durationsMs: motion.durationsMs,
        easings: motion.easings,
        signatures: (motion.signatures ?? []).map(({ kind, durationMs, easing, loops, staggerMs, trigger }) => ({ kind, durationMs, easing, loops, staggerMs, trigger })),
      },
    },
    null,
    2,
  );
}

export function fontsJson(e: Extraction) {
  return JSON.stringify(
    e.fonts.map(({ family, roles, licence, licenceName, install, alternative, note }) => ({ family, roles, licence, licenceName, install, alternative, note })),
    null,
    2,
  );
}

export function iconsJson(e: Extraction) {
  const { library, confidence, names, style, customCount } = e.icons;
  return JSON.stringify(
    {
      library: library ? { name: library.name, package: library.package, licence: library.licence, licenceName: library.licenceName, alternative: library.alternative } : null,
      detectedBy: confidence,
      iconsUsed: names,
      style: {
        sizePx: style.sizePx,
        strokeWidth: style.strokeWidth,
        linecap: style.linecap,
        filled: style.filled,
        grid: style.viewBox,
        colour: "currentColor",
      },
      customIcons: customCount ? { count: customCount, licence: "style_only", guidance: "Recreate the drawing style with the library above; never copy the SVGs." } : null,
    },
    null,
    2,
  );
}

export function componentsMd(e: Extraction, a: Analysis) {
  const measured = e.components
    .map((c) => {
      const s = c.style;
      const states = [c.hover && `hover: ${JSON.stringify(c.hover)}`, c.focus && `focus: ${JSON.stringify(c.focus)}`].filter(Boolean).join("; ");
      return `| ${c.kind} | ${c.count} | ${s.background ?? "transparent"} | ${s.text} | ${s.border ?? "none"} | ${s.radius} | ${s.paddingY}/${s.paddingX} | ${s.height} | ${s.fontSize} ${s.fontWeight} | ${states || "no change measured"} |`;
    })
    .join("\n");
  const recipes = a.components
    .map((c) => `### ${c.name}\n\n${c.recipe}\n\n- States: ${c.states || "none measured"}\n- Use when: ${c.use_when}`)
    .join("\n\n");
  return `# Components

## Recipes

${recipes || "No component recipes."}

## Measured variants

| Kind | Count | Background | Text | Border | Radius | Padding (y/x px) | Height px | Font | States |
|---|---|---|---|---|---|---|---|---|---|
${measured || "| none | | | | | | | | | |"}
`;
}

export function layoutMd(e: Extraction, a: Analysis) {
  const l = e.tokens.layout;
  return `# Layout

${bullets(a.layout)}

## Measurements

- Container width: ${px(l.containerPx)}
- Section padding (median, desktop): ${px(l.sectionPaddingPx)}
- Header: ${l.header ? `${l.header.heightPx}px tall, ${l.header.sticky ? "sticky" : "scrolls away"}, ${l.header.bordered ? "hairline bottom border" : "no border"}` : "none detected"}
- Grid column counts in use: ${l.gridColumns.join(", ") || "none"}
- Flex gaps: ${l.flexGapsPx.map((g) => `${g}px`).join(", ") || "none"}
- Breakpoints: ${e.tokens.breakpoints.map((b) => `${b}px`).join(", ") || "none detected"}
- Spacing grid: ${e.tokens.spacing.base ? `${e.tokens.spacing.base}px (${Math.round(e.tokens.spacing.fit * 100)}% of values fit)` : "irregular"}; scale ${e.tokens.spacing.values.map((v) => `${v}`).join(", ")}

## Imagery

${bullets(a.imagery.length ? a.imagery : ["No imagery guidance."])}

Reference frames (content removed) are in \`frames/\`: desktop 1440px, tablet 820px, mobile 390px.
`;
}

export function motionMd(e: Extraction, a: Analysis) {
  const m = e.tokens.motion;
  const signatures = m.signatures ?? [];
  const io = m.interactions;
  const trigger = (t: string) => (t === "load" ? "runs on its own" : t === "hover" ? "starts on hover" : t === "focus" ? "starts on focus" : t === "scroll" ? "starts as it scrolls into view" : "starts when its state changes (opened, selected, shown)");
  const TARGETS: Record<string, string> = { "list item": "list items", block: "blocks", text: "text", image: "images", "svg path": "SVG paths", "svg tspan": "SVG text", "svg text": "SVG text" };
  const on = (targets: string[]) => [...new Set(targets.map((t) => TARGETS[t] ?? (t.startsWith("svg") ? "SVG shapes" : t)))].join(", ");
  const signatureSection = signatures.length
    ? `
## Signature motion

The animations that make this site feel like itself. Recreate the behaviour with your own elements and content; the keyframes are the measured reference.

${signatures
  .map(
    (s) => `### ${s.label}

${s.description} It ${trigger(s.trigger)}${s.targets.length ? `, on ${on(s.targets)}` : ""}.

\`\`\`css
${s.example.keyframes}
.${s.example.name.replace(/[^a-z0-9-]/gi, "")} { ${s.example.animation} }
\`\`\``,
  )
  .join("\n\n")}
`
    : "";
  const hoverLine = io?.hover.length ? `- **Hover** changes ${io.hover.map((h) => `${h.change} (${Math.round(h.share * 100)}% of hover rules)`).join(", ")}.${io.hover.some((h) => h.change === "position or scale" && h.share >= 0.2) ? "" : " Things rarely move on hover; they change colour."}` : "";
  const triggeredLines = (io?.triggered ?? []).slice(0, 6).map((t) => `- \`${t.name}\`: ${t.kind === "other" ? "custom" : t.kind}, ${t.durationMs}ms ${t.easing}, ${trigger(t.trigger)}.`);
  const interactionSection = io
    ? `
## Interactions

${[hoverLine, io.lineArt ? "- **Illustrations** are line art: thin strokes that stay thin at any size (vector-effect: non-scaling-stroke) on flat fills. Highlight a part by brightening its stroke, not by adding colour." : ""].filter(Boolean).join("\n")}
${triggeredLines.length ? `\nAnimations started by people or state:\n\n${triggeredLines.join("\n")}\n` : ""}`
    : "";
  return `# Motion and Interactions

${a.motion.feel}

${bullets(a.motion.rules)}
${signatureSection}${interactionSection}
## Measurements

- Durations: ${m.durationsMs.map((d) => `${d.ms}ms (${Math.round(d.share * 100)}%)`).join(", ") || "none"}
- Easings: ${m.easings.map((x) => `\`${x.value}\``).join(", ") || "none"}
- Animated properties: ${m.properties.join(", ") || "none"}
${!signatures.length && m.keyframes.length ? `\n## Keyframes in use\n\n${m.keyframes.map((k) => `\`\`\`css\n${k.css}\n\`\`\``).join("\n\n")}\n` : ""}
${io?.reducedMotion ? "The site turns its motion off under `prefers-reduced-motion: reduce`. Do the same: every looping or decorative animation stops, and state changes happen instantly." : "Always respect `prefers-reduced-motion: reduce`."}
`;
}

export function voiceMd(a: Analysis) {
  const examples = a.voice.examples.map((x) => `- **${x.context}**: ${x.text}`).join("\n");
  return `# Voice

Tone: ${a.voice.tone.join(", ")}.

${bullets(a.voice.rules)}
${examples ? `\n## Examples (new sentences in this voice)\n\n${examples}\n` : ""}`;
}

export function rulesMd(e: Extraction, a: Analysis, siteName: string, hasOwnerRules = false, sources?: KitSource[]) {
  return `# ${siteName}: design rules
${hasOwnerRules ? "\n> The site's owner shared their own rules in `owner-rules.md`. Read them first; where they disagree with this file, they win.\n" : ""}
${a.summary}
${sources?.length ? `\nMeasured from ${sources.length} links; values in \`tokens.json\` start from the first one:\n\n${sources.map((s, i) => `${i + 1}. ${s.url}`).join("\n")}\n` : ""}
## Principles

${a.principles.map((p) => `### ${p.title}\n\n${p.rule}\n\n_Why:_ ${p.why}`).join("\n\n")}

## Never

${a.never.map((n) => `- **${n.rule}** ${n.why}`).join("\n")}

## Colour

${bullets(a.colour)}

## Typography

${bullets(a.typography)}

## Shape and depth

${bullets(a.shape)}
`;
}

const LABEL = { free: "✅ Free to reuse", licence_required: "🔑 Needs a licence", style_only: "🎨 Style only" } as const;

export function licencesMd(e: Extraction, attribution: string | null, terms: { licence: string; commercial: boolean; attribution?: string } | null = null, assetCount = 0) {
  const rows = e.items
    .filter((i) => i.kind !== "icon" || i.licence !== "free")
    .map((i) => `| ${i.kind.replace("_", " ")} | ${i.name} | ${LABEL[i.licence]} | ${i.licence_name ?? ""} | ${i.alternative ?? ""} |`)
    .join("\n");
  return `# Licences

Every item in this kit is labelled:

- ✅ **Free to reuse**: values (colours, spacing, radii, easing) and open-source fonts and icons. Install them from their official source.
- 🔑 **Needs a licence**: only use it if you hold a licence. Otherwise use the free alternative listed.
- 🎨 **Style only**: belongs to the site's owner. Recreate the feel (shape, weight, colour treatment); never copy the file.

Design tokens are measured values and are free to reuse.

| Kind | Item | Label | Licence | Free alternative |
|---|---|---|---|---|
${rows || "| | none | | | |"}
${terms ? `\n## Owner's terms\n\nThe site's owner opted in through livery.json under **${terms.licence}**, ${terms.commercial ? "commercial use allowed" : "non-commercial use only"}.${assetCount ? ` The ${assetCount} file(s) in \`assets/\` are shared under these terms; the logo is never included.` : ""}\n` : ""}${attribution ? `\n## Attribution\n\n${attribution}\n` : ""}
${assetCount ? "Apart from the owner-approved files in `assets/`, this kit" : "This kit"} contains no font files, images, logos, stylesheets or text from the source site. Frames in \`frames/\` have images replaced by flat blocks and text replaced by bars.
`;
}
