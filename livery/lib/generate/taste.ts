import type { Extraction } from "@/lib/extract";
import { AnalysisSchema, type Analysis } from "./analysis";
import { clip, colourName, measuredAnalysis, type VoiceProfile } from "./measured";

// A person's taste, measured across the sites they picked. A habit becomes a
// principle only when it holds on every site; where the sites disagree, the
// kit gives the measured range instead of pretending there is one answer.

export type SourceTraits = {
  host: string;
  scheme: "light" | "dark";
  background: string;
  accent: string | null;
  monochrome: boolean;
  display: string;
  body: string;
  pillShare: number;
  mainRadius: number | null;
  shadows: number;
  maxDurationMs: number;
  spacingBase: number | null;
  containerPx: number | null;
  typeRatio: number | null;
  tightHeadings: boolean;
  uppercaseButtons: boolean;
};

export function traitsOf(e: Extraction): SourceTraits {
  const t = e.tokens;
  const scale = t.typography.scale;
  const body = scale.find((s) => s.name === "body") ?? scale[Math.floor(scale.length / 2)];
  const numeric = t.radii.filter((r) => r.px !== "pill").sort((a, b) => b.share - a.share);
  return {
    host: new URL(e.source.finalUrl).hostname.replace(/^www\./, ""),
    scheme: t.palette.scheme,
    background: t.palette.background,
    accent: t.palette.accent,
    monochrome: t.palette.monochrome,
    display: t.typography.families.display,
    body: t.typography.families.body,
    pillShare: t.radii.find((r) => r.px === "pill")?.share ?? 0,
    mainRadius: (numeric[0]?.px as number | undefined) ?? null,
    shadows: t.shadows.filter((s) => s.share >= 0.01).length,
    maxDurationMs: t.motion.durationsMs.length ? Math.max(...t.motion.durationsMs.map((d) => d.ms)) : 0,
    spacingBase: t.spacing.base,
    containerPx: t.layout.containerPx,
    typeRatio: scale[0] && body ? scale[0].sizePx / body.sizePx : null,
    tightHeadings: scale.some((s) => body && s.sizePx > body.sizePx && s.letterSpacingEm < -0.005),
    uppercaseButtons: e.components.some((c) => c.kind === "button" && c.style.textTransform === "uppercase"),
  };
}

const unique = <T,>(values: T[]) => [...new Set(values)];
const list = (values: string[]) => (values.length <= 2 ? values.join(" and ") : `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`);
const span = (values: number[], unit = "px") => {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return lo === hi ? `${lo}${unit}` : `${lo}–${hi}${unit}`;
};

type Principle = Analysis["principles"][number];
type Rule = Analysis["never"][number];

/**
 * The analysis for a taste kit. `merged` is the combined extraction (its
 * first source is the base for values); `sources` are the individual sites.
 */
export function tasteAnalysis(merged: Extraction, sources: Extraction[], options: { label: string; voice?: VoiceProfile }): Analysis {
  const base = measuredAnalysis(merged, { voice: options.voice });
  const traits = sources.map(traitsOf);
  const n = traits.length;
  const every = (test: (t: SourceTraits) => boolean) => traits.every(test);
  const hosts = traits.map((t) => t.host);
  const all = `all ${n} sites`;

  const principles: Principle[] = [];
  const never: Rule[] = [];
  const shared: string[] = [];

  const schemes = unique(traits.map((t) => t.scheme));
  if (schemes.length === 1) {
    principles.push({
      title: `Always ${schemes[0]}`,
      rule: `Design ${schemes[0]}-first: ${schemes[0] === "dark" ? "a dark ground with light type" : "a light ground with dark type"}.`,
      why: `Every one of the ${n} sites (${list(hosts)}) is ${schemes[0]}.`,
    });
    shared.push(`${schemes[0]} grounds`);
  }

  const accents = traits.filter((t) => t.accent && !t.monochrome);
  if (every((t) => t.monochrome)) {
    principles.push({
      title: "Contrast, not colour",
      rule: "Keep the palette neutral; build hierarchy from contrast, weight and size.",
      why: `None of the ${n} sites leans on a saturated colour.`,
    });
    never.push({ rule: "Never introduce a saturated brand colour.", why: `${all} are monochrome.` });
    shared.push("neutral palettes");
  } else if (accents.length === n) {
    const names = unique(accents.map((t) => colourName(t.accent)));
    principles.push({
      title: "One accent per project",
      rule: names.length === 1 ? `Use a single ${names[0]} accent for actions and active states.` : "Pick one accent per project and use it only for actions and active states.",
      why: names.length === 1 ? `${all} use a ${names[0]} accent.` : `Each site has exactly one accent, and it changes from project to project: ${list(names)}.`,
    });
    never.push({ rule: "Never use two competing accent colours in one product.", why: `Each of the ${n} sites commits to one.` });
    shared.push("a single accent");
  }

  const displays = unique(traits.map((t) => t.display));
  if (displays.length === 1) {
    principles.push({
      title: `${clip(displays[0], 40)} as the signature`,
      rule: `Set headings in ${displays[0]}.`,
      why: `${all} use it for display type; it is the most recognisable constant.`,
    });
    shared.push(displays[0]);
  } else if (every((t) => t.tightHeadings)) {
    principles.push({
      title: "Tight, confident headlines",
      rule: "Tighten letter-spacing on large headings; keep body text at normal tracking.",
      why: `${all} tighten their biggest type, whatever the typeface (${list(displays)}).`,
    });
    never.push({ rule: "Never track headings wide.", why: `Large type is tightened on ${all}.` });
  }

  if (every((t) => (t.typeRatio ?? 0) >= 2.5)) {
    principles.push({
      title: "Big type, quiet body",
      rule: "Let the headline be at least two and a half times the body size.",
      why: `Headline-to-body ratios run ${span(traits.map((t) => Math.round((t.typeRatio ?? 0) * 10) / 10), "×")} across the sites.`,
    });
    shared.push("big headlines");
  }

  if (every((t) => t.pillShare >= 0.3)) {
    principles.push({ title: "Pills for controls", rule: "Use fully rounded shapes for buttons and chips.", why: `Pills make up a large share of the radii on ${all}.` });
    never.push({ rule: "Never square off buttons.", why: `${all} round their controls fully.` });
    shared.push("pill controls");
  } else if (every((t) => t.mainRadius !== null && t.mainRadius <= 4 && t.pillShare < 0.1)) {
    principles.push({ title: "Crisp corners", rule: "Keep corners at 4px or less.", why: `The main radius stays between ${span(traits.map((t) => t.mainRadius ?? 0))} on ${all}.` });
    shared.push("crisp corners");
  }

  if (every((t) => t.shadows === 0)) {
    principles.push({ title: "Flat, drawn edges", rule: "Separate surfaces with borders and tone, never shadows.", why: `No visible shadows were measured on any of the ${n} sites.` });
    never.push({ rule: "Never use drop shadows for depth.", why: `${all} are flat.` });
    shared.push("flat surfaces");
  } else if (every((t) => t.shadows > 0)) {
    principles.push({ title: "Soft depth", rule: "Lift raised elements with a soft, neutral shadow.", why: `${all} use shadows to separate layers.` });
  }

  const bases = unique(traits.map((t) => t.spacingBase));
  if (bases.length === 1 && bases[0]) {
    principles.push({ title: "The same grid every time", rule: `Space everything on a ${bases[0]}px grid.`, why: `${all} measure on the ${bases[0]}px grid.` });
    shared.push(`a ${bases[0]}px grid`);
  }

  const durations = traits.map((t) => t.maxDurationMs).filter((d) => d > 0);
  if (durations.length === n && Math.max(...durations) <= 350) {
    never.push({ rule: `Never animate longer than ${Math.max(...durations)}ms.`, why: `The longest transitions run ${span(durations, "ms")} across the sites.` });
    shared.push("quick motion");
  }
  if (every((t) => !t.uppercaseButtons)) never.push({ rule: "Never set button labels in all capitals.", why: `No measured button on ${all} uses uppercase.` });

  // Fill to the schema's minimum with the base site's own rules.
  for (const p of base.principles) if (principles.length < 3 && !principles.some((x) => x.title === p.title)) principles.push(p);
  for (const r of base.never) if (never.length < 3 && !never.some((x) => x.rule === r.rule)) never.push(r);

  // Ranges: where the sites differ, the agent picks within what was measured.
  const range = (label: string, values: string[]) => `${label} across the sites: ${list(unique(values))}.`;
  const colour = [
    ...(schemes.length > 1 ? [range("Themes vary", traits.map((t) => `${t.scheme} on ${t.host}`))] : []),
    range("Backgrounds", traits.map((t) => `${t.background} (${t.host})`)),
    ...(accents.length ? [range("Accents", accents.map((t) => `${t.accent} ${colourName(t.accent)} (${t.host})`))] : []),
    ...base.colour,
  ];
  const typography = [
    ...(displays.length > 1 ? [range("Display typefaces", traits.map((t) => `${t.display} (${t.host})`))] : []),
    ...base.typography,
  ];
  const shape = [
    ...(traits.some((t) => t.mainRadius !== null) ? [`Main corner radius runs ${span(traits.filter((t) => t.mainRadius !== null).map((t) => t.mainRadius!))} across the sites.`] : []),
    ...base.shape,
  ];
  const containers = traits.map((t) => t.containerPx).filter((c): c is number => c !== null);
  const layout = [...(containers.length > 1 ? [`Content width runs ${span(containers)} across the sites.`] : []), ...base.layout];

  const summary = clip(
    `${options.label}, measured across ${n} sites (${list(hosts)}).${shared.length ? ` What holds on every one: ${list(shared)}.` : ""} Where the sites differ, the rules give the measured range, so a new project can sit anywhere inside it and still feel like the same hand.`,
    600,
  );

  const cap = (items: string[], max: number) => items.map((i) => clip(i, 240)).slice(0, max);
  return AnalysisSchema.parse({
    ...base,
    summary,
    principles: principles.slice(0, 7).map((p) => ({ title: clip(p.title, 60), rule: clip(p.rule, 240), why: clip(p.why, 300) })),
    never: never.slice(0, 8).map((r) => ({ rule: clip(r.rule, 240), why: clip(r.why, 300) })),
    colour: cap(colour, 6),
    typography: cap(typography, 6),
    shape: cap(shape, 6),
    layout: cap(layout, 8),
  });
}
