import type { Extraction } from "@/lib/extract";
import { chroma, contrast, hue, luminance, parseColor, type Rgba } from "@/lib/extract/process/color";
import type { ComponentVariant } from "@/lib/extract/process/components";
import { AnalysisSchema, type Analysis } from "./analysis";
import type { DesignWriter } from "./writer";

// Writes a kit's reasoning straight from the measurements, with no model.
// Every rule is triggered by something measured and its "why" quotes the
// number, so the kit stays specific to the site. Voice is analysed from the
// site's copy (sentence length, casing, person, punctuation); its examples
// come from a bank of our own sentences, never from the site.

type Rule = { rule: string; why: string };
type Principle = { title: string; rule: string; why: string };

const pct = (share: number) => `${share < 0.01 ? (share * 100).toFixed(1) : Math.round(share * 100)}%`;
const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

function colourName(hex: string | null) {
  if (!hex) return "neutral";
  const rgba = parseColor(hex);
  if (!rgba) return hex;
  const l = luminance(rgba);
  const tone = l < 0.02 ? "near-black" : l < 0.12 ? "dark" : l > 0.85 ? "near-white" : l > 0.5 ? "light" : "";
  if (chroma(rgba) < 0.04) return tone ? `${tone} neutral` : "mid grey";
  const h = hue(rgba);
  const names: [number, string][] = [
    [20, "pink-red"], [45, "red"], [70, "orange"], [100, "amber"], [120, "yellow"], [140, "lime"], [165, "green"],
    [195, "teal"], [225, "cyan"], [260, "blue"], [290, "indigo"], [320, "violet"], [345, "purple"], [361, "pink"],
  ];
  const name = names.find(([limit]) => h < limit)?.[1] ?? "red";
  return tone && tone !== "light" ? `${tone} ${name}` : name;
}

const px = (value: string) => Math.round(parseFloat(value) || 0);
const withArticle = (word: string) => `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;

function describeRadius(r: string) {
  const n = px(r);
  return n >= 999 ? "fully rounded (pill)" : n === 0 ? "square" : `${n}px`;
}

function componentName(c: ComponentVariant, accent: string | null, index: number) {
  const accentFill = accent && c.style.background?.toLowerCase() === accent.toLowerCase();
  switch (c.kind) {
    case "button":
      return accentFill ? "Primary button" : c.style.background ? `Filled button ${index + 1}` : c.style.border ? "Outline button" : "Ghost button";
    case "card":
      return index === 0 ? "Card" : `Card variant ${index + 1}`;
    case "input":
      return "Text input";
    case "badge":
      return "Badge";
    case "tab":
      return "Tab";
    case "nav-link":
      return index === 0 ? "Navigation link" : `Navigation link ${index + 1}`;
  }
}

function describeStates(c: ComponentVariant) {
  const parts: string[] = [];
  const say = (label: string, state: ComponentVariant["hover"]) => {
    if (!state) return;
    const changes = Object.entries(state)
      .filter(([, v]) => v && v !== "none")
      .map(([k, v]) => {
        const key = { bg: "background", color: "text", borderColor: "border", boxShadow: "shadow", outline: "outline", transform: "transform", opacity: "opacity" }[k] ?? k;
        return `${key} → ${String(v).slice(0, 48)}`;
      });
    if (changes.length) parts.push(`${label}: ${changes.join(", ")}`);
  };
  say("Hover", c.hover);
  say("Focus", c.focus);
  return parts.join(". ") || "No visible change was measured on hover or focus.";
}

// ---------------------------------------------------------------------------
// Voice: measured from the copy, examples picked from our own bank.
// ---------------------------------------------------------------------------

const VERBS = /^(get|start|try|book|join|sign|create|build|explore|learn|see|view|read|watch|download|contact|talk|buy|shop|discover|find|make|open|request|subscribe|order|launch|go|back|enter|host|vote|apply|install|add|save|share|send|claim)\b/i;

function voiceProfile(text: Extraction["text"]) {
  const prose = [...text.paragraphs, ...text.headings];
  const sentences = prose.flatMap((p) => p.split(/(?<=[.!?])\s+/)).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3);
  const words = prose.join(" ").split(/\s+/).filter(Boolean);
  const avgWords = sentences.length ? sentences.reduce((n, s) => n + s.split(/\s+/).length, 0) / sentences.length : 0;
  const per100 = (re: RegExp) => (words.length ? (prose.join(" ").match(re)?.length ?? 0) / (words.length / 100) : 0);
  const titleCase = text.headings.filter((h) => {
    const long = h.split(/\s+/).filter((w) => w.length >= 4);
    return long.length >= 2 && long.filter((w) => /^[A-Z]/.test(w)).length / long.length > 0.7;
  }).length;
  const casedHeadings = text.headings.filter((h) => h.split(/\s+/).filter((w) => w.length >= 4).length >= 2).length;
  const actions = text.actions.filter((a) => a.length <= 40);
  return {
    sampled: sentences.length + text.headings.length + actions.length,
    avgWords,
    you: per100(/\b(you|your|you're|yours)\b/gi),
    we: per100(/\b(we|our|we're|us)\b/gi),
    exclaims: prose.filter((p) => p.includes("!")).length,
    questions: text.headings.filter((h) => h.trim().endsWith("?")).length,
    titleCase,
    casedHeadings,
    uppercaseActions: actions.filter((a) => a === a.toUpperCase() && /[A-Z]/.test(a)).length,
    verbActions: actions.filter((a) => VERBS.test(a.trim())).length,
    actionCount: actions.length,
    avgActionWords: actions.length ? actions.reduce((n, a) => n + a.split(/\s+/).length, 0) / actions.length : 0,
    numbers: per100(/\b\d[\d,.%$]*\b/g),
  };
}

const EXAMPLE_BANK = {
  short: [
    { context: "headline" as const, text: "Plan less. Ship more." },
    { context: "button" as const, text: "Start now" },
    { context: "empty state" as const, text: "Nothing here yet." },
    { context: "error" as const, text: "That didn't work. Try again." },
  ],
  long: [
    { context: "headline" as const, text: "Everything your team needs to plan, build and ship in one place." },
    { context: "button" as const, text: "Create your first project" },
    { context: "empty state" as const, text: "You haven't added anything yet. Your first item will appear here." },
    { context: "error" as const, text: "We couldn't save your changes. Check your connection and try again." },
  ],
  energetic: [
    { context: "headline" as const, text: "Your best work starts today!" },
    { context: "button" as const, text: "Let's go" },
  ],
  title: [{ context: "subheading" as const, text: "Built For Teams That Move Fast" }],
};

function voice(e: Extraction): Analysis["voice"] {
  const v = voiceProfile(e.text);
  if (v.sampled < 4) {
    return {
      tone: ["plain", "clear"],
      rules: ["Too little copy could be read to measure a voice; keep the project's current tone.", "Keep labels short and specific."],
      examples: [],
    };
  }
  const concise = v.avgWords > 0 && v.avgWords <= 13;
  const tone = [
    concise ? "concise" : v.avgWords > 20 ? "explanatory" : "measured",
    v.you >= 2 ? "direct" : v.we >= 2 ? "first-person plural" : "impersonal",
    v.exclaims > 1 ? "energetic" : "calm",
    v.titleCase > v.casedHeadings / 2 ? "formal" : "conversational",
    ...(v.numbers >= 2 ? ["concrete"] : []),
  ].slice(0, 6);
  const rules: string[] = [];
  if (v.avgWords) rules.push(`Keep sentences around ${Math.round(v.avgWords)} words; that is the measured average across the site's copy.`);
  if (v.casedHeadings >= 2) {
    rules.push(
      v.titleCase > v.casedHeadings / 2
        ? `Write headings in Title Case, as ${v.titleCase} of ${v.casedHeadings} measured headings are.`
        : `Write headings in sentence case; only ${v.titleCase} of ${v.casedHeadings} measured headings use Title Case.`,
    );
  }
  if (v.you >= 2) rules.push(`Address the reader as "you" (about ${v.you.toFixed(1)} times per 100 words on the site).`);
  else if (v.we >= 2) rules.push(`Speak as "we" (about ${v.we.toFixed(1)} times per 100 words); the reader is rarely addressed directly.`);
  rules.push(v.exclaims > 1 ? "Exclamation marks appear in the copy; use them sparingly for real moments of energy." : "Avoid exclamation marks; the measured copy almost never uses them.");
  if (v.actionCount >= 2) {
    rules.push(
      `Label buttons with ${v.verbActions >= v.actionCount / 2 ? "a verb first" : "short nouns or phrases"}, about ${Math.max(1, Math.round(v.avgActionWords))} word${Math.round(v.avgActionWords) === 1 ? "" : "s"} long${v.uppercaseActions > v.actionCount / 2 ? ", set in capitals" : ""}.`,
    );
  }
  if (v.questions >= 2) rules.push("Some headings are questions; use a question when a section answers one.");
  if (v.numbers >= 2) rules.push("Use concrete numbers where you can; the copy leans on them.");
  const examples = [
    ...(concise ? EXAMPLE_BANK.short : EXAMPLE_BANK.long),
    ...(v.exclaims > 1 ? EXAMPLE_BANK.energetic : []),
    ...(v.titleCase > v.casedHeadings / 2 ? EXAMPLE_BANK.title : []),
  ].slice(0, 6);
  return { tone, rules: rules.slice(0, 8), examples };
}

// ---------------------------------------------------------------------------
// The analysis
// ---------------------------------------------------------------------------

export function measuredAnalysis(e: Extraction): Analysis {
  const t = e.tokens;
  const p = t.palette;
  const bg = parseColor(p.background) as Rgba;
  const text = parseColor(p.text);
  const accentSwatch = p.swatches.find((s) => s.role === "accent");
  const saturated = p.swatches.filter((s) => s.role === "accent" || s.role.startsWith("hue-"));
  const realShadows = t.shadows.filter((s) => s.share >= 0.01);
  const pill = t.radii.find((r) => r.px === "pill");
  const numericRadii = t.radii.filter((r) => r.px !== "pill").map((r) => r.px as number);
  const mainRadius = [...t.radii].filter((r) => r.px !== "pill").sort((a, b) => b.share - a.share)[0]?.px as number | undefined;
  const scale = t.typography.scale;
  const body = scale.find((s) => s.name === "body") ?? scale[Math.floor(scale.length / 2)];
  const largest = scale[0];
  const tightHeadings = scale.filter((s) => body && s.sizePx > body.sizePx && s.letterSpacingEm < -0.005);
  const durations = t.motion.durationsMs;
  const maxDuration = durations.length ? Math.max(...durations.map((d) => d.ms)) : 0;
  const families = [...new Set([t.typography.families.display, t.typography.families.body])];
  const buttons = e.components.filter((c) => c.kind === "button");
  const uppercaseButtons = buttons.some((b) => b.style.textTransform === "uppercase");
  const scheme = p.scheme;

  // Principles
  const principles: Principle[] = [];
  if (p.accent && accentSwatch) {
    principles.push({
      title: "One accent, used sparingly",
      rule: `Reserve the ${colourName(p.accent)} accent (${p.accent}) for primary actions, links and active states.`,
      why: `It covers only ${pct(accentSwatch.share)} of the measured page, so wherever it appears it reads as the next step.`,
    });
  } else if (p.monochrome) {
    principles.push({
      title: "Contrast, not colour",
      rule: "Build hierarchy from contrast, weight and size; keep the palette neutral.",
      why: "No saturated colour carries real weight on the measured page; emphasis comes from dark-on-light contrast alone.",
    });
  }
  if (realShadows.length === 0 && p.border) {
    principles.push({
      title: "Flat surfaces, drawn edges",
      rule: `Separate surfaces with ${t.borderWidths[0] ?? "1px"} borders in ${p.border}${p.surface ? ` and the ${p.surface} surface tone` : ""}, not shadows.`,
      why: "No visible shadows were measured, so depth comes from lines and tone shifts, which keeps the page calm.",
    });
  } else if (realShadows.length) {
    principles.push({
      title: "Soft, neutral depth",
      rule: `Lift raised elements with the measured shadow (${clip(realShadows[0].value, 80)}).`,
      why: `Shadows appear on about ${pct(realShadows[0].share)} of elements; they mark what floats above the page${realShadows.some((s) => s.tinted) ? "" : " and are never tinted"}.`,
    });
  }
  if (largest && body && largest.sizePx / body.sizePx >= 2.5) {
    principles.push({
      title: "Big type, quiet body",
      rule: `Pair ${largest.sizePx}px headings with ${body.sizePx}px body text in ${t.typography.families.display}.`,
      why: `A ${(largest.sizePx / body.sizePx).toFixed(1)}× jump between headline and body creates strong hierarchy with few elements.`,
    });
  } else if (body) {
    principles.push({
      title: "Even, compact hierarchy",
      rule: `Keep type sizes close together, anchored on ${body.sizePx}px body text.`,
      why: `The largest measured size is only ${largest ? (largest.sizePx / body.sizePx).toFixed(1) : "1"}× the body size; hierarchy comes from weight and spacing instead.`,
    });
  }
  if (t.spacing.base) {
    principles.push({
      title: "A steady rhythm",
      rule: `Space everything on the ${t.spacing.base}px grid: ${t.spacing.values.slice(0, 8).join(", ")}px.`,
      why: `${Math.round(t.spacing.fit * 100)}% of measured spacing values fall on this grid, which is what makes the layout feel ordered.`,
    });
  }
  if (pill && pill.share >= 0.3) {
    principles.push({
      title: "Rounded and approachable",
      rule: `Use pill shapes for buttons and chips${mainRadius ? `, and ${mainRadius}px corners for containers` : ""}.`,
      why: `Fully rounded shapes make up ${pct(pill.share)} of measured radii; they soften an otherwise structured page.`,
    });
  } else if (mainRadius !== undefined) {
    principles.push({
      title: mainRadius <= 4 ? "Crisp corners" : "Consistent corners",
      rule: `Use ${mainRadius}px corners as the default radius.`,
      why: `It is the most common measured radius; one radius family is what makes separate components feel like one product.`,
    });
  }
  if (principles.length < 3 && t.layout.containerPx) {
    principles.push({
      title: "A clear reading width",
      rule: `Keep content inside a ${t.layout.containerPx}px container.`,
      why: "Every section shares this measured width, so the page reads as one column of intent.",
    });
  }
  while (principles.length < 3) {
    principles.push({
      title: "Respect the measured tokens",
      rule: "Take colour, type, spacing and radius from tokens.json rather than inventing new values.",
      why: "Every value in the kit was measured from the live site; new values are where a design drifts.",
    });
  }

  // Never
  const never: Rule[] = [];
  if (realShadows.length === 0) never.push({ rule: "Never use drop shadows for depth.", why: "No visible shadows were measured anywhere on the site." });
  else if (!realShadows.some((s) => s.tinted)) never.push({ rule: "Never tint shadows with colour.", why: "Every measured shadow is neutral; a coloured glow would read as a different product." });
  if (saturated.length <= 1 && p.accent) never.push({ rule: "Never introduce a second accent colour.", why: `Only one saturated colour (${p.accent}) carries weight in the measured palette.` });
  if (tightHeadings.length) {
    never.push({
      rule: "Never use positive letter-spacing on headings.",
      why: `Large type is tightened, down to ${Math.min(...tightHeadings.map((s) => s.letterSpacingEm))}em on the biggest sizes.`,
    });
  }
  if (numericRadii.length && Math.max(...numericRadii) <= 8 && !pill) {
    never.push({ rule: `Never round corners beyond ${Math.max(...numericRadii)}px.`, why: "The measured radii stay small; big curves would soften a deliberately crisp design." });
  }
  if (pill && pill.share >= 0.3 && buttons.some((b) => px(b.style.radius) >= 999)) {
    never.push({ rule: "Never square off buttons.", why: "Measured buttons are fully rounded; square ones would break the shape language." });
  }
  if (maxDuration && maxDuration <= 350) {
    never.push({ rule: `Never animate longer than ${maxDuration}ms.`, why: `Every measured transition finishes within ${maxDuration}ms; slower motion would feel heavy here.` });
  }
  if (buttons.length && !uppercaseButtons) never.push({ rule: "Never set button labels in all capitals.", why: "No measured button uses uppercase text." });
  if (families.length === 1) {
    never.push({ rule: "Never mix in a second display typeface.", why: `Headings and body share ${families[0]}; a second family would split the voice.` });
  }
  if (t.spacing.base && t.spacing.fit >= 0.7) never.push({ rule: `Never use spacing off the ${t.spacing.base}px grid.`, why: `${Math.round(t.spacing.fit * 100)}% of measured spacing sits on it.` });
  if (never.length < 3) never.push({ rule: "Never add decoration the measurements don't show.", why: "The kit records what the site does; additions (gradients, glows, textures) are where a copy stops resembling it." });
  if (never.length < 3) never.push({ rule: "Never introduce colours outside tokens.json.", why: "The measured palette is complete; extra colours dilute the design's identity." });

  // Colour, type, shape
  const colour = [
    `${scheme === "dark" ? "Dark" : "Light"} theme: ${colourName(p.background)} background (${p.background})${p.surface ? ` with ${p.surface} surfaces` : ""}.`,
    text ? `Body text ${p.text} on the background reads at ${contrast(text, bg).toFixed(1)}:1${p.textMuted ? `; secondary text uses ${p.textMuted}` : ""}.` : `Body text uses ${p.text}.`,
    p.accent ? `Accent ${p.accent} (${colourName(p.accent)}) with ${p.onAccent ?? "contrasting"} text on top of it.` : "There is no saturated accent; links and actions rely on weight and underline.",
    ...(t.alternatePalette ? [`A ${t.alternatePalette.scheme} theme also exists: ${t.alternatePalette.background} background, ${t.alternatePalette.text} text; tokens.json lists both.`] : []),
  ];
  const typography = [
    `${families.join(" for headings, ")}${families.length > 1 ? " for body" : " throughout"}${t.typography.families.mono ? `, ${t.typography.families.mono} for code` : ""}.`,
    `Scale: ${scale.slice(0, 7).map((s) => `${s.name} ${s.sizePx}px`).join(", ")}.`,
    `Weights in use: ${t.typography.weights.join(", ") || "400"}.`,
    ...(tightHeadings.length ? [`Headings are tightened (${tightHeadings[0].letterSpacingEm}em at ${tightHeadings[0].sizePx}px); body text keeps normal tracking.`] : []),
  ];
  const shape = [
    `Radii: ${t.radii.map((r) => (r.px === "pill" ? `pill (${pct(r.share)})` : `${r.px}px (${pct(r.share)})`)).join(", ") || "square corners"}.`,
    `Borders: ${t.borderWidths.join(", ") || "none"} in ${p.border ?? "the border tone"}.`,
    realShadows.length ? `Shadows: ${realShadows.map((s) => clip(s.value, 70)).join(" | ")}.` : "No shadows: elevation comes from surface tone and borders.",
  ];

  // Components
  const perKind = new Map<string, number>();
  const components = e.components.slice(0, 8).map((c) => {
    const index = perKind.get(c.kind) ?? 0;
    perKind.set(c.kind, index + 1);
    const s = c.style;
    return {
      kind: c.kind,
      name: clip(componentName(c, p.accent, index), 40),
      recipe: clip(
        `${s.background ? `${s.background} background` : "Transparent background"}, ${s.text} text, ${describeRadius(s.radius)} corners, ${s.paddingY}px × ${s.paddingX}px padding, ${s.fontSize} at weight ${s.fontWeight}${s.border ? `, ${s.border} border` : ""}${s.shadow ? `, shadow ${s.shadow}` : ""}${s.textTransform !== "none" ? `, ${s.textTransform}` : ""}. Measured ${c.count} on the page.`,
        400,
      ),
      states: clip(describeStates(c), 300),
      use_when: clip(
        c.kind === "button" && p.accent && s.background?.toLowerCase() === p.accent.toLowerCase()
          ? "The single most important action in a view."
          : c.kind === "button"
            ? "Secondary actions that sit beside the primary one."
            : c.kind === "card"
              ? "Grouping related content into a scannable block."
              : c.kind === "nav-link"
                ? "Top-level navigation."
                : "Wherever this element appears in the project.",
        200,
      ),
    };
  });

  // Layout, motion, imagery
  const l = t.layout;
  const layout = [
    l.containerPx ? `Content sits in a ${l.containerPx}px container, centred.` : "Content runs close to full width; there is no single measured container.",
    l.sectionPaddingPx ? `Sections breathe with about ${l.sectionPaddingPx}px of vertical padding on desktop.` : "Sections are separated by spacing rather than heavy padding.",
    l.header ? `The header is ${l.header.heightPx}px tall, ${l.header.sticky ? "sticks to the top" : "scrolls away"}${l.header.bordered ? " and sits on a hairline border" : ""}.` : "There is no persistent header.",
    ...(l.gridColumns.length ? [`Grids use ${l.gridColumns.join(", ")} columns.`] : []),
    ...(t.breakpoints.length ? [`Breakpoints at ${t.breakpoints.join(", ")}px; layouts collapse to one column on phones.`] : []),
  ];
  const motion = {
    feel: !t.motion.animated
      ? "Almost static: interface changes happen instantly."
      : maxDuration <= 160
        ? `Snappy: transitions finish within ${maxDuration}ms.`
        : maxDuration <= 350
          ? `Quick and quiet: transitions run ${durations.map((d) => `${d.ms}ms`).join(", ")}.`
          : `Expressive: some motion runs as long as ${maxDuration}ms.`,
    rules: [
      ...(durations.length ? [`Default to ${durations[0].ms}ms transitions (${pct(durations[0].share)} of measured ones).`] : []),
      ...(t.motion.easings.length ? [`Ease with ${t.motion.easings[0].value}.`] : []),
      ...(t.motion.properties.length ? [`Animate ${t.motion.properties.slice(0, 4).join(", ")}; avoid animating layout.`] : []),
      "Respect prefers-reduced-motion.",
    ].slice(0, 6),
  };
  const im = e.imagery;
  const imagery = [
    ...(im.images + im.backgroundImages ? [`${im.images + im.backgroundImages} images on the page${im.roundedImages ? `, ${im.roundedImages} with rounded corners (about ${im.averageImageRadius}px)` : ", mostly with square corners"}.`] : ["The page uses almost no imagery; interface and type carry it."]),
    ...(im.illustrations ? [`${im.illustrations} vector illustrations; recreate their style, never the files.`] : []),
    ...(e.icons.library ? [`Icons: ${e.icons.library.name}${e.icons.style.sizePx ? ` at ${e.icons.style.sizePx}px` : ""}${e.icons.style.strokeWidth ? `, ${e.icons.style.strokeWidth}px stroke` : ""}.`] : e.icons.customCount ? [`${e.icons.customCount} custom icons; use a similar open-source set${e.icons.style.strokeWidth ? ` at a ${e.icons.style.strokeWidth}px stroke` : ""}.`] : []),
  ].slice(0, 5);

  const summary = clip(
    `A ${scheme} interface on ${withArticle(colourName(p.background))} background${p.accent ? ` where ${withArticle(colourName(p.accent))} accent marks the next step` : ", built on contrast rather than colour"}. Type is ${t.typography.families.display}${tightHeadings.length ? " set tight at large sizes" : ""}, corners are ${pill && pill.share >= 0.3 ? "fully rounded on controls" : mainRadius !== undefined ? `${mainRadius}px` : "square"}, and depth comes from ${realShadows.length ? "soft neutral shadows" : "borders and surface tone rather than shadows"}.`,
    600,
  );

  const analysis: Analysis = {
    summary: summary.length >= 40 ? summary : `${summary} Measured from the live site at three screen sizes.`,
    principles: principles.slice(0, 7).map((x) => ({ title: clip(x.title, 60), rule: clip(x.rule, 240), why: clip(x.why, 300) })),
    never: never.slice(0, 8).map((x) => ({ rule: clip(x.rule, 240), why: clip(x.why, 300) })),
    colour: colour.map((c) => clip(c, 240)).slice(0, 6),
    typography: typography.map((c) => clip(c, 240)).slice(0, 6),
    shape: shape.map((c) => clip(c, 240)).slice(0, 6),
    components,
    layout: layout.map((c) => clip(c, 240)).slice(0, 8),
    motion: { feel: clip(motion.feel, 240), rules: motion.rules.map((r) => clip(r, 240)) },
    imagery: imagery.map((c) => clip(c, 240)),
    voice: voice(e),
  };
  return AnalysisSchema.parse(analysis);
}

/** The kit writer Livery uses: no model, no network, no cost, never busy. */
export function measuredWriter(extraction: Extraction): DesignWriter {
  return { name: "measurements", write: async () => measuredAnalysis(extraction) };
}
