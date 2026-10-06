import { distance, flatten, parseColor, toHex, type Rgba } from "./color";

export type ColorCluster = { hex: string; rgba: Rgba; weight: number; share: number; members: number };

/**
 * Merges perceptually near-identical colours (Tailwind, CSS-in-JS and design
 * drift produce dozens of one-off shades) into a short list, heaviest first.
 * Translucent colours are flattened over `backdrop` before comparing.
 */
export function clusterColors(weights: Record<string, number>, backdrop: Rgba, threshold = 0.025): ColorCluster[] {
  const parsed = Object.entries(weights)
    .map(([value, weight]) => {
      const color = parseColor(value);
      return color ? { color: color.a < 1 ? flatten(color, backdrop) : color, weight } : null;
    })
    .filter((x): x is { color: Rgba; weight: number } => x !== null)
    .sort((a, b) => b.weight - a.weight);

  const clusters: { rgba: Rgba; weight: number; members: number }[] = [];
  for (const { color, weight } of parsed) {
    const home = clusters.find((c) => distance(c.rgba, color) < threshold);
    if (home) {
      home.weight += weight;
      home.members++;
    } else {
      clusters.push({ rgba: color, weight, members: 1 });
    }
  }
  const total = clusters.reduce((sum, c) => sum + c.weight, 0) || 1;
  return clusters
    .sort((a, b) => b.weight - a.weight)
    .map((c) => ({ hex: toHex(c.rgba), rgba: c.rgba, weight: c.weight, share: c.weight / total, members: c.members }));
}

/** Adds weights from several maps (one per viewport) into one. */
export function mergeWeights(...maps: Record<string, number>[]) {
  const out: Record<string, number> = {};
  for (const map of maps) for (const [key, value] of Object.entries(map)) out[key] = (out[key] ?? 0) + value;
  return out;
}

export function topEntries(map: Record<string, number>, limit: number) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}
