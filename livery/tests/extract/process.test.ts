import { describe, expect, it } from "vitest";
import { contrast, parseColor, toHex } from "@/lib/extract/process/color";
import { clusterColors } from "@/lib/extract/process/cluster";
import { breakpoints, radii, spacingScale, visibleShadow } from "@/lib/extract/process/tokens";

const WHITE = { r: 255, g: 255, b: 255, a: 1 };

describe("parseColor", () => {
  it.each([
    ["rgb(15, 124, 114)", "#0f7c72"],
    ["rgba(15, 124, 114, 0.5)", "#0f7c7280"],
    ["rgb(15 124 114 / 50%)", "#0f7c7280"],
    ["#abc", "#aabbcc"],
    ["hsl(173, 78%, 27%)", "#0f7b6e"],
    ["oklch(0.52 0.09 182)", "#0e7a6d"],
    ["oklab(0.52 -0.09 -0.004)", "#0d7a6d"],
    ["color(srgb 0.0588 0.486 0.447)", "#0f7c72"],
    ["lab(46 -32 -3)", "#027b71"],
  ])("%s -> %s", (input, hex) => {
    const parsed = parseColor(input);
    expect(parsed).not.toBeNull();
    const out = toHex(parsed!);
    // Expected values are what Chrome itself renders; allow small rounding differences.
    const diff = [1, 3, 5].map((i) => Math.abs(parseInt(out.slice(i, i + 2), 16) - parseInt(hex.slice(i, i + 2), 16)));
    expect(Math.max(...diff)).toBeLessThanOrEqual(3);
  });

  it.each(["transparent", "currentcolor", "none", "nonsense"])("returns null for %s", (input) => expect(parseColor(input)).toBeNull());

  it("computes WCAG contrast", () => {
    expect(contrast(parseColor("#000")!, WHITE)).toBeCloseTo(21, 0);
  });
});

describe("clusterColors", () => {
  it("merges near-identical shades and keeps distinct ones", () => {
    const clusters = clusterColors({ "rgb(15, 124, 114)": 10, "rgb(16, 125, 115)": 5, "rgb(255, 0, 0)": 3 }, WHITE);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].members).toBe(2);
    expect(clusters[0].share).toBeCloseTo(15 / 18, 2);
  });

  it("flattens translucent colours over the backdrop", () => {
    const [cluster] = clusterColors({ "rgba(0, 0, 0, 0.5)": 1 }, WHITE);
    expect(cluster.hex).toBe("#808080");
  });
});

describe("scales", () => {
  it("detects an 8px grid and snaps strays", () => {
    const scale = spacingScale({ 8: 40, 16: 30, 24: 20, 32: 10, 15: 2, 7: 1 });
    expect(scale.base).toBe(8);
    expect(scale.values).toEqual([8, 16, 24, 32]);
  });

  it("falls back to a 4px grid", () => {
    expect(spacingScale({ 4: 10, 12: 10, 20: 10, 8: 5 }).base).toBe(4);
  });

  it("groups radii and recognises pills", () => {
    expect(radii({ "12px": 10, "12.2px": 1, "9999px": 5, "50%": 2, "33554400px": 3 })).toEqual([
      { px: 12, share: 0.524 },
      { px: "pill", share: 0.476 },
    ]);
  });

  it("reads breakpoints in px and em", () => {
    expect(breakpoints(["(min-width: 768px)", "(max-width: 64em)", "(min-width: 768px) and (max-width: 1023px)"])).toEqual([768, 1023, 1024]);
  });

  it("strips invisible shadow layers", () => {
    expect(visibleShadow("rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 1px 3px 0px")).toBe(
      "rgba(0, 0, 0, 0.1) 0px 1px 3px 0px",
    );
    expect(visibleShadow("rgba(0, 0, 0, 0) 0px 0px 0px 0px")).toBeNull();
  });
});
