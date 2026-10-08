// Runs in the page's own JavaScript world (chrome.scripting world: "MAIN"),
// because the measuring script's isolated world can't see the page's
// globals. Reads only library names and versions: nothing else leaves here.
// Must stay self-contained: Chrome serialises this one function.
import type { StackHit } from "../../lib/extract/collect/collectDesign";

export function pageGlobals(): StackHit[] {
  const w = window as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const hits: StackHit[] = [];
  const add = (name: string, category: StackHit["category"], evidence: string, version?: unknown) => {
    hits.push({ name, category, evidence, strong: true, ...(typeof version === "string" || typeof version === "number" ? { version: String(version).slice(0, 20) } : {}) });
  };
  const nodes = [document.getElementById("root"), document.getElementById("__next"), document.getElementById("app"), ...Array.from(document.body?.children ?? []).slice(0, 20)];
  if (nodes.some((el) => el && Object.keys(el).some((k) => k.startsWith("__reactContainer$") || k.startsWith("__reactFiber$")))) add("React", "framework", "React fiber on DOM nodes");
  if (w.__THREE__) add("Three.js", "3d", "window.__THREE__", `r${w.__THREE__}`);
  if (w.gsap) add("GSAP", "motion", "window.gsap", w.gsap.version);
  if (w.PIXI) add("PixiJS", "3d", "window.PIXI", w.PIXI.VERSION);
  if (w.BABYLON) add("Babylon.js", "3d", "window.BABYLON", w.BABYLON.Engine?.Version);
  if (w.jQuery?.fn?.jquery) add("jQuery", "framework", "window.jQuery", w.jQuery.fn.jquery);
  if (w.__VUE__ || w.Vue) add("Vue", "framework", "Vue runtime", w.Vue?.version);
  if (w.Alpine) add("Alpine.js", "framework", "window.Alpine", w.Alpine.version);
  if (w.lottie || w.bodymovin) add("Lottie", "motion", "Lottie runtime");
  if (w.lenis || w.Lenis) add("Lenis", "scroll", "Lenis instance");
  if (w.anime) add("anime.js", "motion", "window.anime", w.anime.version);
  return hits;
}
