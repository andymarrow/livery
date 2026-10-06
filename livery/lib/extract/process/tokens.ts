import type { RawDesign } from "../collect/collectDesign";
import { chroma, contrast, distance, hue, luminance, parseColor, toHex, toOklab, type Rgba } from "./color";
import { clusterColors, mergeWeights, topEntries, type ColorCluster } from "./cluster";

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const SATURATED = 0.06;

export type Palette = {
  scheme: "light" | "dark";
  background: string;
  surface: string | null;
  surfaceAlt: string | null;
  text: string;
  textMuted: string | null;
  border: string | null;
  accent: string | null;
  onAccent: string | null;
  /** True when the design has no saturated accent: it leans on contrast alone. */
  monochrome: boolean;
  /** Every distinct colour that carries real weight, heaviest first. */
  swatches: { hex: string; share: number; role: string }[];
};

export type TypeStep = { name: string; sizePx: number; weight: number; lineHeight: number | null; letterSpacingEm: number; roles: string[]; share: number };

export type Typography = {
  families: { body: string; display: string; mono: string | null; stacks: Record<string, string> };
  scale: TypeStep[];
  weights: number[];
};

export type Scale = { base: 4 | 8 | null; values: number[]; fit: number };

const firstFamily = (stack: string) => stack.split(",")[0].trim().replace(/^["']|["']$/g, "");

function pickPalette(raw: RawDesign): Palette {
  const backdrop = parseColor(raw.pageBackground) ?? WHITE;
  const backgrounds = clusterColors(raw.colors.background, backdrop);
  const texts = clusterColors(raw.colors.text, backdrop);
  const borders = clusterColors(raw.colors.border, backdrop);
  const accentish = clusterColors(raw.colors.accentish, backdrop);

  const background = backdrop;
  const scheme = luminance(background) < 0.2 ? "dark" : "light";
  // Surfaces sit close to the page in lightness; a white button on a dark page is not a surface.
  const bgL = toOklab(background).L;
  const neutralSurfaces = backgrounds.filter(
    (c) => chroma(c.rgba) < SATURATED && distance(c.rgba, background) > 0.015 && Math.abs(toOklab(c.rgba).L - bgL) < 0.2 && c.share > 0.01,
  );
  const surface = neutralSurfaces[0] ?? null;
  const surfaceAlt = neutralSurfaces.find((c) => surface && distance(c.rgba, surface.rgba) > 0.015) ?? null;

  // Main text is the highest-contrast neutral among the colours that carry real
  // weight; muted text is the next one down. (Muted text often has more characters.)
  const weightyTexts = texts.filter((c) => c.share >= 0.05 && chroma(c.rgba) < SATURATED);
  const byContrast = (list: ColorCluster[]) => [...list].sort((a, b) => contrast(b.rgba, background) - contrast(a.rgba, background));
  const weightyPick = byContrast(weightyTexts)[0];
  const text = weightyPick && contrast(weightyPick.rgba, background) >= 3 ? weightyPick : byContrast(texts)[0];
  const textRgba = text?.rgba ?? (scheme === "dark" ? WHITE : { r: 0, g: 0, b: 0, a: 1 });
  const textMuted =
    texts.find(
      (c) => c !== text && chroma(c.rgba) < SATURATED && distance(c.rgba, textRgba) > 0.04 &&
        contrast(c.rgba, background) >= 2.2 && contrast(c.rgba, background) < contrast(textRgba, background),
    ) ?? null;
  // Borders are quiet: neutral and low-contrast against the page.
  const border =
    borders.find((c) => chroma(c.rgba) < SATURATED && contrast(c.rgba, background) < 3.5) ??
    [...borders].sort((a, b) => contrast(a.rgba, background) - contrast(b.rgba, background))[0] ??
    null;

  // Accent: the saturated colour used on actions and links, falling back to
  // the most used saturated colour anywhere.
  const score = new Map<string, { cluster: ColorCluster; score: number }>();
  const consider = (list: ColorCluster[], factor: number) => {
    for (const c of list) {
      if (chroma(c.rgba) < SATURATED) continue;
      const existing = [...score.values()].find((s) => distance(s.cluster.rgba, c.rgba) < 0.04);
      if (existing) existing.score += c.share * factor;
      else score.set(c.hex, { cluster: c, score: c.share * factor });
    }
  };
  consider(accentish, 3);
  consider(backgrounds, 1);
  consider(texts, 1);
  const accentPick = [...score.values()].sort((a, b) => b.score - a.score)[0]?.cluster ?? null;
  const onAccent = accentPick
    ? contrast(accentPick.rgba, WHITE) >= contrast(accentPick.rgba, textRgba) || scheme === "dark"
      ? contrast(accentPick.rgba, WHITE) >= 3
        ? "#ffffff"
        : toHex(scheme === "dark" ? background : textRgba)
      : toHex(textRgba)
    : null;

  const named = new Map<string, string>();
  named.set(toHex(background), "background");
  if (surface) named.set(surface.hex, "surface");
  if (surfaceAlt) named.set(surfaceAlt.hex, "surface-alt");
  if (text) named.set(text.hex, "text");
  if (textMuted) named.set(textMuted.hex, "text-muted");
  if (border) named.set(border.hex, "border");
  if (accentPick) named.set(accentPick.hex, "accent");

  const everything = clusterColors(mergeWeights(raw.colors.background, raw.colors.text, raw.colors.border), backdrop, 0.03);
  const swatches = everything
    .filter((c) => c.share > 0.004)
    .slice(0, 14)
    .map((c) => {
      const role = [...named.entries()].find(([hex]) => distance(parseColor(hex)!, c.rgba) < 0.03)?.[1];
      return { hex: c.hex, share: round(c.share, 3), role: role ?? (chroma(c.rgba) >= SATURATED ? `hue-${Math.round(hue(c.rgba))}` : "neutral") };
    });

  return {
    scheme,
    background: toHex(background),
    surface: surface?.hex ?? null,
    surfaceAlt: surfaceAlt?.hex ?? null,
    text: toHex(textRgba),
    textMuted: textMuted?.hex ?? null,
    border: border?.hex ?? null,
    accent: accentPick?.hex ?? null,
    onAccent,
    monochrome: !accentPick,
    swatches,
  };
}

function typography(raws: RawDesign[]): Typography {
  type Entry = { stack: string; size: number; weight: number; lineHeight: number | null; letterSpacing: number; role: string; chars: number };
  const entries: Entry[] = [];
  for (const raw of raws) {
    for (const [key, chars] of Object.entries(raw.textStyles)) {
      const [stack, size, weight, lineHeight, letterSpacing, role] = key.split("|");
      const sizePx = parseFloat(size);
      if (!sizePx) continue;
      entries.push({
        stack,
        size: Math.round(sizePx * 2) / 2,
        weight: parseInt(weight, 10) || 400,
        lineHeight: lineHeight === "normal" ? null : parseFloat(lineHeight),
        letterSpacing: letterSpacing === "normal" ? 0 : parseFloat(letterSpacing) / sizePx,
        role,
        chars,
      });
    }
  }
  const total = entries.reduce((sum, e) => sum + e.chars, 0) || 1;

  const familyWeight = (filter: (e: Entry) => boolean) => {
    const byFamily: Record<string, number> = {};
    const stacks: Record<string, string> = {};
    for (const e of entries.filter(filter)) {
      const family = firstFamily(e.stack);
      byFamily[family] = (byFamily[family] ?? 0) + e.chars;
      stacks[family] = e.stack;
    }
    const top = topEntries(byFamily, 1)[0]?.[0] ?? null;
    return { top, stacks };
  };
  const body = familyWeight((e) => ["body", "link", "small", "button"].includes(e.role));
  const display = familyWeight((e) => /^h[1-3]$/.test(e.role));
  const mono = familyWeight((e) => e.role === "code");

  const bySize = new Map<number, Entry[]>();
  for (const e of entries) bySize.set(e.size, [...(bySize.get(e.size) ?? []), e]);
  const steps = [...bySize.entries()]
    .map(([size, list]) => {
      const chars = list.reduce((sum, e) => sum + e.chars, 0);
      const dominant = [...list].sort((a, b) => b.chars - a.chars)[0];
      const roles = [...new Set(list.map((e) => e.role))];
      return {
        sizePx: size,
        weight: dominant.weight,
        lineHeight: dominant.lineHeight ? round(dominant.lineHeight, 2) : null,
        letterSpacingEm: round(dominant.letterSpacing, 3),
        roles,
        share: chars / total,
      };
    })
    .filter((s) => s.share >= 0.004 || s.roles.some((r) => /^h[1-3]$/.test(r)))
    .sort((a, b) => b.sizePx - a.sizePx)
    .slice(0, 10);

  // Names follow size order, not the HTML tags a site happened to use.
  const bodyStep = [...steps].sort((a, b) => b.share - a.share).find((s) => s.sizePx >= 12 && s.sizePx <= 20);
  const bodySize = bodyStep?.sizePx ?? 16;
  const larger = steps.filter((s) => s.sizePx > bodySize);
  const headingNames = larger[0] && larger[0].sizePx >= 44 ? ["display", "h1", "h2", "h3", "h4", "h5", "h6"] : ["h1", "h2", "h3", "h4", "h5", "h6"];
  const smallerNames = ["small", "caption", "micro", "micro-2"];
  let smallerIndex = 0;
  const named: TypeStep[] = steps.map((s) => {
    let name: string;
    if (s === bodyStep) name = "body";
    else if (s.sizePx > bodySize) name = headingNames[larger.indexOf(s)] ?? `size-${s.sizePx}`;
    else name = smallerNames[smallerIndex++] ?? `size-${s.sizePx}`;
    return { name, ...s, share: round(s.share, 3) };
  });
  // Keep names unique (the first, largest, keeps the plain name).
  const seen = new Map<string, number>();
  for (const step of named) {
    const n = seen.get(step.name) ?? 0;
    seen.set(step.name, n + 1);
    if (n > 0) step.name = `${step.name}-${n + 1}`;
  }

  const weights = [...new Set(entries.filter((e) => e.chars / total > 0.01).map((e) => e.weight))].sort((a, b) => a - b);
  const bodyFamily = body.top ?? display.top ?? "system-ui";
  return {
    families: {
      body: bodyFamily,
      display: display.top ?? bodyFamily,
      mono: mono.top,
      stacks: { ...mono.stacks, ...display.stacks, ...body.stacks },
    },
    scale: named,
    weights,
  };
}

export function spacingScale(weights: Record<string, number>): Scale {
  const values = Object.entries(weights).map(([v, w]) => [Number(v), w] as const).filter(([v]) => v > 0);
  const total = values.reduce((sum, [, w]) => sum + w, 0) || 1;
  const fit = (base: number) => values.filter(([v]) => v % base === 0).reduce((sum, [, w]) => sum + w, 0) / total;
  const fit8 = fit(8);
  const fit4 = fit(4);
  const base = fit8 >= 0.7 ? 8 : fit4 >= 0.6 ? 4 : null;
  const snap = (v: number) => (v < 4 ? v : Math.round(v / (base ?? 4)) * (base ?? 4));
  const snapped: Record<number, number> = {};
  for (const [v, w] of values) snapped[snap(v)] = (snapped[snap(v)] ?? 0) + w;
  const scale = Object.entries(snapped)
    .filter(([, w]) => w / total > 0.01)
    .map(([v]) => Number(v))
    .sort((a, b) => a - b)
    .slice(0, 14);
  return { base, values: scale, fit: round(base === 8 ? fit8 : fit4, 2) };
}

export type Radius = { px: number | "pill"; share: number };

export function radii(weights: Record<string, number>): Radius[] {
  const buckets: Record<string, number> = {};
  for (const [value, weight] of Object.entries(weights)) {
    const px = parseFloat(value);
    const key = value.endsWith("%") || px >= 999 ? "pill" : String(Math.round(px));
    buckets[key] = (buckets[key] ?? 0) + weight;
  }
  const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
  return topEntries(buckets, 8)
    .filter(([, w]) => w / total > 0.02)
    .map(([key, w]) => ({ px: key === "pill" ? ("pill" as const) : Number(key), share: round(w / total, 3) }))
    .sort((a, b) => (a.px === "pill" ? 1 : b.px === "pill" ? -1 : a.px - b.px));
}

export type ShadowToken = { value: string; share: number; tinted: boolean };

const COLOR_IN_SHADOW = /(rgba?|oklch|oklab|lab|lch|color|hsla?)\([^)]*\)|#[0-9a-f]{3,8}/gi;

/** Drops invisible layers (Tailwind's "rgba(0,0,0,0) 0 0 0 0" ring placeholders) from a shadow list. */
export function visibleShadow(value: string) {
  const layers = value.split(/,(?![^(]*\))/).map((l) => l.trim());
  const kept = layers.filter((layer) => {
    const colors = layer.match(COLOR_IN_SHADOW) ?? [];
    const visibleColor = colors.length === 0 || colors.some((c) => (parseColor(c)?.a ?? 1) > 0.01);
    const lengths = (layer.replace(COLOR_IN_SHADOW, "").match(/-?[\d.]+px/g) ?? []).map(parseFloat);
    return visibleColor && lengths.some((n) => n !== 0);
  });
  return kept.length ? kept.join(", ") : null;
}

export function shadows(weights: Record<string, number>, elementCount: number): ShadowToken[] {
  const cleaned: Record<string, number> = {};
  for (const [value, count] of Object.entries(weights)) {
    const visible = visibleShadow(value);
    if (visible) cleaned[visible] = (cleaned[visible] ?? 0) + count;
  }
  return topEntries(cleaned, 5).map(([value, count]) => {
    const colors = value.match(COLOR_IN_SHADOW) ?? [];
    const tinted = colors.some((c) => {
      const parsed = parseColor(c);
      return parsed ? chroma(parsed) >= 0.05 && parsed.a > 0.08 : false;
    });
    return { value, share: round(count / Math.max(1, elementCount), 3), tinted };
  });
}

export function breakpoints(queries: string[]) {
  const values: Record<string, number> = {};
  for (const q of queries) {
    for (const m of q.matchAll(/(min|max)-width:\s*([\d.]+)(px|em|rem)/g)) {
      const px = Math.round(parseFloat(m[2]) * (m[3] === "px" ? 1 : 16));
      if (px >= 320 && px <= 2000) values[px] = (values[px] ?? 0) + 1;
    }
  }
  return topEntries(values, 6).map(([v]) => Number(v)).sort((a, b) => a - b);
}

export type Motion = {
  durationsMs: { ms: number; share: number }[];
  easings: { value: string; share: number }[];
  properties: string[];
  keyframes: { name: string; css: string }[];
  animated: boolean;
};

export function motion(raws: RawDesign[]): Motion {
  const durations = mergeWeights(...raws.map((r) => r.transitions.durations));
  const easings = mergeWeights(...raws.map((r) => r.transitions.easings));
  const properties = mergeWeights(...raws.map((r) => r.transitions.properties));
  const animations = mergeWeights(...raws.map((r) => r.animations));
  const keyframes = Object.assign({}, ...raws.map((r) => r.keyframes)) as Record<string, string>;
  const toMs = (d: string) => (d.endsWith("ms") ? parseFloat(d) : parseFloat(d) * 1000);
  const msWeights: Record<string, number> = {};
  for (const [d, w] of Object.entries(durations)) {
    const ms = Math.round(toMs(d));
    if (ms > 0 && ms <= 3000) msWeights[ms] = (msWeights[ms] ?? 0) + w;
  }
  const dTotal = Object.values(msWeights).reduce((a, b) => a + b, 0) || 1;
  const eTotal = Object.values(easings).reduce((a, b) => a + b, 0) || 1;
  return {
    durationsMs: topEntries(msWeights, 5).map(([ms, w]) => ({ ms: Number(ms), share: round(w / dTotal, 2) })),
    easings: topEntries(easings, 4).map(([value, w]) => ({ value, share: round(w / eTotal, 2) })),
    properties: topEntries(properties, 8).map(([p]) => p),
    // Generated names ("dot-0-3-upDown") collapse to one pattern each.
    keyframes: [...new Map(
      topEntries(animations, 40)
        .filter(([name]) => keyframes[name])
        .map(([name]) => [name.replace(/\d+/g, "#"), { name, css: keyframes[name] }] as const),
    ).values()].slice(0, 8),
    animated: Object.keys(msWeights).length > 0 || Object.keys(animations).length > 0,
  };
}

export type Layout = {
  containerPx: number | null;
  sectionPaddingPx: number | null;
  header: { heightPx: number; sticky: boolean; bordered: boolean } | null;
  gridColumns: number[];
  flexGapsPx: number[];
};

export function layout(desktop: RawDesign): Layout {
  // Wrappers of 1800px+ are full-bleed guards, not the reading container.
  const container = topEntries(Object.fromEntries(Object.entries(desktop.layout.containerWidths).filter(([w]) => Number(w) < 1800)), 1)[0];
  const paddings = desktop.layout.sections.map((s) => Math.max(s.paddingTop, s.paddingBottom)).filter((p) => p > 0).sort((a, b) => a - b);
  const header = desktop.layout.header;
  return {
    containerPx: container ? Number(container[0]) : null,
    sectionPaddingPx: paddings.length ? paddings[Math.floor(paddings.length / 2)] : null,
    header: header
      ? { heightPx: header.height, sticky: header.position === "sticky" || header.position === "fixed", bordered: header.borderBottom !== "none" }
      : null,
    gridColumns: topEntries(desktop.layout.gridColumns, 4).map(([v]) => Number(v)),
    flexGapsPx: topEntries(desktop.layout.flexGaps, 5).map(([v]) => Number(v)).sort((a, b) => a - b),
  };
}

export function buildTokens(byWidth: { mobile: RawDesign; tablet: RawDesign; desktop: RawDesign }, alternate: RawDesign | null) {
  const all = [byWidth.mobile, byWidth.tablet, byWidth.desktop];
  const desktop = byWidth.desktop;
  const palette = pickPalette(desktop);
  const otherPalette = alternate ? pickPalette(alternate) : null;
  const elementCount = Object.values(desktop.spacing).reduce((a, b) => a + b, 0) / 4;
  return {
    palette,
    /** The site's other theme (dark if the main one is light, and vice versa), when it has one. */
    alternatePalette: otherPalette && otherPalette.scheme !== palette.scheme ? otherPalette : null,
    typography: typography(all),
    spacing: spacingScale(mergeWeights(...all.map((r) => r.spacing))),
    radii: radii(mergeWeights(...all.map((r) => r.radii))),
    shadows: shadows(desktop.shadows, elementCount),
    borderWidths: topEntries(desktop.borderWidths, 3).map(([v]) => v),
    breakpoints: breakpoints(all.flatMap((r) => r.mediaQueries)),
    motion: motion(all),
    layout: layout(desktop),
    rootVariables: Object.fromEntries(Object.entries(desktop.rootVariables).slice(0, 120)),
  };
}

export type Tokens = ReturnType<typeof buildTokens>;

function round(value: number, places: number) {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}
