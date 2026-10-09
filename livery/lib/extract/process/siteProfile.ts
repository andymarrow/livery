import type { RawDesign, StackHit } from "../collect/collectDesign";

// What makes a site itself beyond its tokens: what it seems to be built with
// (never certain, so every entry carries its evidence and a confidence), how
// its 3D or canvas work is done, and the small craft details people notice
// without naming. Deterministic: read from the page, no model.

export type StackEntry = { name: string; category: StackHit["category"]; evidence: string; version: string | null; confidence: "detected" | "likely" };

export type Scene = {
  engine: string | null;
  version: string | null;
  renderer: "WebGPU" | "WebGL" | null;
  /** Share of the first screen the largest canvas covers. */
  coverage: number;
  aboveFold: boolean;
  canvases: number;
  /** The scene's main colours, most used first (from a shot of the largest canvas). */
  colors: string[];
  /** How it's done here and how to do it in a new project. */
  notes: string[];
};

export type Detail = { title: string; description: string };

export type SiteProfile = { stack: StackEntry[]; scene: Scene | null; details: Detail[] };

const CATEGORY_ORDER: StackHit["category"][] = ["framework", "builder", "css", "ui", "motion", "scroll", "3d", "fonts"];

export function stackOf(raws: RawDesign[]): StackEntry[] {
  const merged = new Map<string, StackEntry>();
  for (const hit of raws.flatMap((r) => r.signals?.stack ?? [])) {
    const seen = merged.get(hit.name);
    const entry: StackEntry = { name: hit.name, category: hit.category, evidence: hit.evidence, version: hit.version ?? null, confidence: hit.strong ? "detected" : "likely" };
    if (!seen || (seen.confidence === "likely" && entry.confidence === "detected")) merged.set(hit.name, { ...entry, version: entry.version ?? seen?.version ?? null });
  }
  return [...merged.values()].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
}

const pct = (share: number) => `${Math.round(share * 100)}%`;

export function sceneOf(raws: RawDesign[], stack: StackEntry[]): Scene | null {
  const canvases = raws.map((r) => r.signals?.canvases).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const three3d = stack.filter((s) => s.category === "3d");
  const largest = canvases.reduce((max, c) => Math.max(max, c.largestShare), 0);
  if (!three3d.length && largest < 0.15) return null;
  const engines = [...new Set(canvases.flatMap((c) => c.engines))];
  const three = stack.find((s) => s.name === "Three.js");
  const engine = three3d.find((s) => s.name !== "React Three Fiber") ?? null;
  const renderer = engines.some((e) => /webgpu/i.test(e)) ? "WebGPU" : three || engines.some((e) => /three|babylon|webgl/i.test(e)) ? "WebGL" : null;
  const aboveFold = canvases.some((c) => c.aboveFold);
  const where = largest >= 0.9 ? "fills the first screen" : largest >= 0.4 ? `covers ${pct(largest)} of the first screen` : `takes ${pct(largest)} of the first screen`;
  const notes: string[] = [];
  if (largest > 0) notes.push(`${engine ? "The scene renders" : "The page draws"} into a canvas that ${where}${aboveFold ? "" : " further down the page"}.`);
  if (three) {
    const rev = three.version?.match(/\d+/)?.[0];
    const fiber = stack.some((s) => s.name === "React Three Fiber");
    notes.push(`Built with Three.js${three.version ? ` ${three.version}` : ""}${renderer === "WebGPU" ? " on its WebGPU renderer" : ""}${fiber ? ", inside a React app, most likely through React Three Fiber" : ""}.`);
    notes.push(fiber || stack.some((s) => s.name === "React") ? `To recreate: \`three\`${rev ? ` (0.${rev}.x)` : ""} with \`@react-three/fiber\` and \`@react-three/drei\`; one <Canvas> per page.` : `To recreate: \`three\`${rev ? ` (0.${rev}.x)` : ""} with one renderer per page.`);
  } else if (engine?.name === "Spline") {
    notes.push("Built in Spline. Export the scene and embed it with `@splinetool/react-spline` in React, or `<spline-viewer>` on any page.");
  } else if (engine?.name === "Babylon.js") {
    notes.push("Built with Babylon.js. Recreate with `@babylonjs/core`, one engine per canvas.");
  } else if (engine?.name === "PlayCanvas") {
    notes.push("Built with PlayCanvas. Recreate with the `playcanvas` engine, or embed the published PlayCanvas project.");
  } else if (engine?.name === "Unicorn Studio") {
    notes.push("Built in Unicorn Studio (WebGL effects). Recreate by embedding the exported Unicorn Studio scene, or with custom shaders in Three.js or OGL.");
  } else if (engine?.name === "PixiJS") {
    notes.push("Drawn with PixiJS (2D WebGL). Recreate with `pixi.js`.");
  } else if (engine?.name === "p5.js") {
    notes.push("Drawn with p5.js. Recreate with `p5` (or `react-p5` in React).");
  } else {
    notes.push("Its engine isn't identifiable from the page: it may be a 2D canvas, raw WebGL, or a library loaded as a module.");
  }
  const colors = canvases.find((c) => c.colors?.length)?.colors ?? [];
  if (colors.length) notes.push(`The scene's main colours, most used first: ${colors.join(", ")}. Light, materials and background should land on these, so the page around it can share the same palette.`);
  notes.push(`Keep it light: cap devicePixelRatio at 2, render only while the canvas is on screen, show a still frame under prefers-reduced-motion, and a static image when ${renderer === "WebGPU" ? "WebGPU or WebGL" : "WebGL"} isn't available.`);
  return { engine: engine?.name ?? null, version: engine?.version ?? null, renderer, coverage: Math.round(largest * 100) / 100, aboveFold, canvases: Math.max(0, ...canvases.map((c) => c.count)), colors, notes };
}

const FEATURE_NAMES: Record<string, string> = {
  tnum: "tabular figures",
  "tabular-nums": "tabular figures",
  lnum: "lining figures",
  "lining-nums": "lining figures",
  onum: "old-style figures",
  "oldstyle-nums": "old-style figures",
  zero: "slashed zero",
  "slashed-zero": "slashed zero",
  smcp: "small caps",
  dlig: "discretionary ligatures",
  frac: "fractions",
  "diagonal-fractions": "fractions",
  case: "case-sensitive forms",
  calt: "contextual alternates",
};

function featureSentence(features: Record<string, number>) {
  const top = Object.entries(features).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  if (!top.length) return null;
  const variants = top.filter((f) => /^cv\d\d$/.test(f)).sort().slice(0, 6);
  const sets = top.filter((f) => /^ss\d\d$/.test(f)).sort().slice(0, 4);
  const named = [...new Set(top.map((f) => FEATURE_NAMES[f]).filter(Boolean))];
  const parts = [variants.length ? `character variants ${variants.join(", ")}` : "", sets.length ? `stylistic set${sets.length > 1 ? "s" : ""} ${sets.join(", ")}` : "", ...named].filter(Boolean);
  return parts.length ? `The type uses OpenType features: ${parts.join("; ")}. Turn on the same ones (font-feature-settings / font-variant-numeric) where the font supports them.` : null;
}

const transparentColour = (c: string) => !c || /^(transparent|rgba\([^)]*,\s*0\)|none)$/.test(c.trim());

export function detailsOf(raws: RawDesign[], stack: StackEntry[]): Detail[] {
  const all = raws.map((r) => r.signals?.details).filter((d): d is NonNullable<typeof d> => Boolean(d));
  if (!all.length) return [];
  const max = (key: "backdropBlur" | "blendModes" | "gradientText" | "outlinedText" | "sticky" | "preserve3d" | "clipShapes" | "masks" | "variableAxes" | "balancedText" | "underlineOffset") => Math.max(...all.map((d) => d[key]));
  const any = (key: "customCursor" | "smoothScroll" | "scrollSnap" | "grain" | "viewTransitions" | "scrollbar") => all.some((d) => d[key]);
  const merge = (key: "filters" | "fontFeatures") => all.reduce<Record<string, number>>((acc, d) => {
    for (const [k, n] of Object.entries(d[key])) acc[k] = Math.max(acc[k] ?? 0, n);
    return acc;
  }, {});
  const out: Detail[] = [];
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

  if (max("backdropBlur")) out.push({ title: "Frosted glass", description: `${n(max("backdropBlur"), "surface blurs", "surfaces blur")} what's behind ${max("backdropBlur") === 1 ? "it" : "them"} (backdrop-filter), usually headers, menus and overlays.` });
  const smooth = stack.find((s) => s.category === "scroll");
  if (any("smoothScroll")) out.push({ title: "Smooth scrolling", description: smooth ? `Scrolling is smoothed by ${smooth.name}; the page glides rather than jumps.` : "The page scrolls smoothly to anchors (scroll-behavior: smooth)." });
  if (max("sticky")) out.push({ title: "Sticky elements", description: `${n(max("sticky"), "element holds its", "elements hold their")} place while the page scrolls (position: sticky).` });
  if (any("scrollSnap")) out.push({ title: "Scroll snapping", description: "Scrolling settles on whole items or sections (scroll-snap)." });
  if (max("gradientText")) out.push({ title: "Filled text", description: `${n(max("gradientText"), "piece of text is", "pieces of text are")} filled with a colour blend or image (background-clip: text).` });
  if (max("outlinedText")) out.push({ title: "Outlined text", description: "Some text is drawn as an outline (-webkit-text-stroke)." });
  const features = featureSentence(merge("fontFeatures"));
  if (features) out.push({ title: "OpenType features", description: features });
  if (max("variableAxes") >= 3) out.push({ title: "Tuned variable fonts", description: `${max("variableAxes")} text elements set variable font axes directly (font-variation-settings), for weights and widths between the usual steps.` });
  if (max("balancedText") >= 3) out.push({ title: "Balanced line breaks", description: `Headings and paragraphs wrap evenly (text-wrap: balance / pretty) on ${max("balancedText")} elements: no lonely last words.` });
  if (max("underlineOffset")) out.push({ title: "Considered underlines", description: "Links set their own underline offset rather than the browser default." });
  if (max("blendModes") >= 3) out.push({ title: "Blend modes", description: `${max("blendModes")} elements blend into what's behind them (mix-blend-mode).` });
  const filters = Object.entries(merge("filters")).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (filters.length && filters[0][1] >= 3) out.push({ title: "Filters", description: `Images and shapes are treated with ${filters.map(([f, c]) => `${f} (${c})`).join(", ")}.` });
  if (max("clipShapes") >= 3 || max("masks") >= 3) out.push({ title: "Shaped edges and fades", description: `${[max("clipShapes") ? n(max("clipShapes"), "clip-path shape", "clip-path shapes") : "", max("masks") ? n(max("masks"), "mask", "masks") : ""].filter(Boolean).join(" and ")} cut or fade edges instead of hard rectangles.` });
  if (max("preserve3d") >= 2) out.push({ title: "3D CSS", description: `${max("preserve3d")} elements use perspective or preserve-3d for depth without WebGL.` });
  if (any("grain")) out.push({ title: "Grain texture", description: "A fine noise texture sits over surfaces (an SVG turbulence filter or noise image), so flat colour feels printed." });
  if (any("customCursor")) out.push({ title: "Custom cursor", description: "The system cursor is replaced by the site's own." });
  if (any("viewTransitions")) out.push({ title: "Page transitions", description: "Navigating between pages animates through the View Transitions API." });
  const selection = all.map((d) => d.selection).find((s) => s && !transparentColour(s.background));
  if (selection) out.push({ title: "Selection colour", description: `Selected text is ${selection.color && !transparentColour(selection.color) ? `${selection.color} on ` : "highlighted with "}${selection.background} (::selection).` });
  const ring = all.map((d) => d.focusRing).find(Boolean);
  if (ring) out.push({ title: "Focus ring", description: `Keyboard focus shows as ${ring} (:focus-visible).` });
  if (any("scrollbar")) out.push({ title: "Styled scrollbars", description: "Scrollbars are restyled to match the interface." });
  return out.slice(0, 16);
}

export function siteProfile(raws: RawDesign[]): SiteProfile | undefined {
  if (!raws.some((r) => r.signals)) return undefined;
  const stack = stackOf(raws);
  return { stack, scene: sceneOf(raws, stack), details: detailsOf(raws, stack) };
}
