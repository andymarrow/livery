import type { Extraction } from "@/lib/extract";
import type { Frame } from "@/lib/extract/frames";
import type { ComponentVariant } from "@/lib/extract/process/components";
import type { Tokens } from "@/lib/extract/process/tokens";
import type { VoiceProfile } from "@/lib/generate/measured";

// Combines the stored measurements of several page kits into one extraction.
// The first source is the base: its palette roles, type families, layout and
// breakpoints are kept as they are. Everything measured as a share (swatches,
// radii, shadows, type steps, durations) is averaged across sources, so a
// habit that shows up on every page outweighs one that shows up once.

/** What a published page kit keeps in kit_versions.data.extraction. */
export type StoredSource = Pick<Extraction, "source" | "tokens" | "fonts" | "icons" | "components" | "imagery" | "items"> & { voice?: VoiceProfile };

type Shared = { share: number };

function mergeShared<T extends Shared>(lists: T[][], key: (item: T) => string, limit: number): T[] {
  const merged = new Map<string, T>();
  for (const list of lists) {
    for (const item of list) {
      const k = key(item);
      const seen = merged.get(k);
      merged.set(k, seen ? { ...seen, share: seen.share + item.share } : { ...item });
    }
  }
  return [...merged.values()]
    .map((item) => ({ ...item, share: Math.round((item.share / lists.length) * 1000) / 1000 }))
    .sort((a, b) => b.share - a.share)
    .slice(0, limit);
}

function byFrequency<T>(lists: T[][], limit: number): T[] {
  const counts = new Map<T, number>();
  for (const list of lists) for (const item of list) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([item]) => item);
}

const mode = <T,>(values: T[]) => byFrequency([values], 1)[0];

export function mergeTokens(all: Tokens[]): Tokens {
  const [base] = all;
  const scale = mergeShared(
    all.map((t) => t.typography.scale),
    (s) => `${s.sizePx}/${s.weight}`,
    10,
  ).sort((a, b) => b.sizePx - a.sizePx);
  // Every source names its own steps ("body", "h1"), so names repeat after a
  // merge. The heaviest step keeps the name; the others are numbered.
  const byShare = [...scale].sort((a, b) => b.share - a.share);
  const seen = new Map<string, number>();
  const renamed = new Map(
    byShare.map((step) => {
      const n = (seen.get(step.name) ?? 0) + 1;
      seen.set(step.name, n);
      return [step, n === 1 ? step.name : `${step.name}-${n}`] as const;
    }),
  );
  for (const step of scale) step.name = renamed.get(step)!;
  const spacingBases = all.map((t) => t.spacing.base);
  return {
    ...base,
    palette: { ...base.palette, swatches: mergeShared(all.map((t) => t.palette.swatches), (s) => s.hex.toLowerCase(), 12) },
    typography: {
      ...base.typography,
      scale,
      weights: [...new Set(all.flatMap((t) => t.typography.weights))].sort((a, b) => a - b),
    },
    spacing: {
      base: spacingBases.every((b) => b === base.spacing.base) ? base.spacing.base : (mode(spacingBases) ?? null),
      values: [...new Set(all.flatMap((t) => t.spacing.values))].sort((a, b) => a - b).slice(0, 14),
      fit: Math.round((all.reduce((n, t) => n + t.spacing.fit, 0) / all.length) * 100) / 100,
    },
    radii: mergeShared(all.map((t) => t.radii), (r) => String(r.px), 6),
    shadows: mergeShared(all.map((t) => t.shadows), (s) => s.value, 5),
    borderWidths: byFrequency(all.map((t) => t.borderWidths), 3),
    motion: {
      durationsMs: mergeShared(all.map((t) => t.motion.durationsMs), (d) => String(d.ms), 5),
      easings: mergeShared(all.map((t) => t.motion.easings), (e) => e.value, 4),
      properties: byFrequency(all.map((t) => t.motion.properties), 8),
      keyframes: [...new Map(all.flatMap((t) => t.motion.keyframes).map((k) => [k.name, k] as const)).values()].slice(0, 8),
      animated: all.some((t) => t.motion.animated),
      // One signature per kind across the sources: the one that moves the most.
      signatures: [...all.flatMap((t) => t.motion.signatures ?? []).reduce((byKind, s) => {
        const seen = byKind.get(s.kind);
        if (!seen || s.count > seen.count) byKind.set(s.kind, s);
        return byKind;
      }, new Map<string, NonNullable<typeof base.motion.signatures>[number]>()).values()].slice(0, 8),
      interactions: mergeInteractions(all.map((t) => t.motion.interactions)),
    },
  };
}

function mergeInteractions(list: (Tokens["motion"]["interactions"])[]): Tokens["motion"]["interactions"] {
  const present = list.filter((i): i is NonNullable<typeof i> => Boolean(i));
  if (!present.length) return undefined;
  const hoverRules = present.reduce((n, i) => n + i.hoverRules, 0);
  const hover = new Map<string, number>();
  for (const i of present) for (const h of i.hover) hover.set(h.change, (hover.get(h.change) ?? 0) + h.share * i.hoverRules);
  return {
    hover: [...hover.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([change, n]) => ({ change, share: hoverRules ? Math.round((n / hoverRules) * 100) / 100 : 0 })),
    hoverRules,
    triggered: [...new Map(present.flatMap((i) => i.triggered).map((t) => [t.name, t] as const)).values()].slice(0, 8),
    reducedMotion: present.some((i) => i.reducedMotion),
    lineArt: present.some((i) => i.lineArt),
  };
}

const recipeKey = (c: ComponentVariant) => [c.kind, c.style.background, c.style.text, c.style.radius, c.style.border, c.style.fontWeight].join("|").toLowerCase();

function mergeComponents(lists: ComponentVariant[][]) {
  const merged = new Map<string, ComponentVariant>();
  for (const list of lists) {
    for (const c of list) {
      const k = recipeKey(c);
      const seen = merged.get(k);
      merged.set(k, seen ? { ...seen, count: seen.count + c.count, hover: seen.hover ?? c.hover, focus: seen.focus ?? c.focus } : c);
    }
  }
  // Keep the base page's order (it is already ranked), then add what other pages bring.
  return [...merged.values()].slice(0, 16);
}

export function mergeVoice(profiles: (VoiceProfile | undefined)[]): VoiceProfile | undefined {
  const known = profiles.filter((p): p is VoiceProfile => Boolean(p && p.sampled > 0));
  if (!known.length) return undefined;
  const total = known.reduce((n, p) => n + p.sampled, 0);
  const weighted = (key: keyof VoiceProfile) => known.reduce((n, p) => n + p[key] * p.sampled, 0) / total;
  const sum = (key: keyof VoiceProfile) => known.reduce((n, p) => n + p[key], 0);
  return {
    sampled: total,
    avgWords: weighted("avgWords"),
    you: weighted("you"),
    we: weighted("we"),
    numbers: weighted("numbers"),
    avgActionWords: weighted("avgActionWords"),
    exclaims: sum("exclaims"),
    questions: sum("questions"),
    titleCase: sum("titleCase"),
    casedHeadings: sum("casedHeadings"),
    uppercaseActions: sum("uppercaseActions"),
    verbActions: sum("verbActions"),
    actionCount: sum("actionCount"),
  };
}

const mean = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1));

/** A stored source as an extraction the writer can read: no copy, no frames. */
export function toExtraction(source: StoredSource, frames: Frame[] = []): Extraction {
  return { ...source, frames, text: { headings: [], paragraphs: [], actions: [] }, assetCandidates: null };
}

export function mergeSources(sources: StoredSource[], frames: Frame[]): { extraction: Extraction; voice: VoiceProfile | undefined } {
  if (sources.length < 2) throw new Error("combining needs at least two sources");
  const [base] = sources;
  const fonts = new Map<string, Extraction["fonts"][number]>();
  for (const font of sources.flatMap((s) => s.fonts)) {
    const seen = fonts.get(font.family.toLowerCase());
    fonts.set(font.family.toLowerCase(), seen ? { ...seen, roles: [...new Set([...seen.roles, ...font.roles])] } : font);
  }
  const items = new Map(sources.flatMap((s) => s.items).map((item) => [`${item.kind}|${item.name}`.toLowerCase(), item] as const));
  const images = sources.map((s) => s.imagery);
  const rounded = images.filter((i) => i.roundedImages > 0);

  const extraction: Extraction = {
    source: {
      url: base.source.url,
      finalUrl: base.source.finalUrl,
      extractedAt: sources.map((s) => s.source.extractedAt).sort().at(-1)!,
      extractorVersion: base.source.extractorVersion,
    },
    tokens: mergeTokens(sources.map((s) => s.tokens)),
    fonts: [...fonts.values()],
    icons: base.icons.library ? base.icons : (sources.find((s) => s.icons.library)?.icons ?? base.icons),
    components: mergeComponents(sources.map((s) => s.components)),
    imagery: {
      images: mean(images.map((i) => i.images)),
      backgroundImages: mean(images.map((i) => i.backgroundImages)),
      videos: mean(images.map((i) => i.videos)),
      roundedImages: mean(images.map((i) => i.roundedImages)),
      averageImageRadius: mean(rounded.map((i) => i.averageImageRadius)),
      illustrations: mean(images.map((i) => i.illustrations)),
    },
    items: [...items.values()],
    frames,
    text: { headings: [], paragraphs: [], actions: [] },
    assetCandidates: null,
  };
  return { extraction, voice: mergeVoice(sources.map((s) => s.voice)) };
}
