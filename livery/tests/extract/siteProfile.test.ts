import { describe, expect, it } from "vitest";
import type { RawDesign, SiteSignals, StackHit } from "@/lib/extract/collect/collectDesign";
import { detailsOf, sceneOf, siteProfile, stackOf } from "@/lib/extract/process/siteProfile";

const details = (d: Partial<SiteSignals["details"]> = {}): SiteSignals["details"] => ({
  backdropBlur: 0, blendModes: 0, gradientText: 0, outlinedText: 0, sticky: 0, preserve3d: 0, clipShapes: 0, masks: 0, filters: {}, fontFeatures: {}, variableAxes: 0,
  balancedText: 0, underlineOffset: 0, customCursor: false, smoothScroll: false, scrollSnap: false, grain: false, viewTransitions: false, scrollbar: false, selection: null, focusRing: null, ...d,
});
const page = (stack: StackHit[], canvases: Partial<SiteSignals["canvases"]> = {}, d: Partial<SiteSignals["details"]> = {}) =>
  ({ signals: { stack, canvases: { count: 0, largestShare: 0, engines: [], aboveFold: false, ...canvases }, details: details(d) } }) as unknown as RawDesign;

describe("site profile", () => {
  it("merges the stack across widths, keeps the strongest evidence, and orders by category", () => {
    const stack = stackOf([
      page([{ name: "Tailwind CSS", category: "css", evidence: "80 utility classes", strong: false }, { name: "Next.js", category: "framework", evidence: "assets under /_next/static/", strong: true }]),
      page([{ name: "Tailwind CSS", category: "css", evidence: "400 utility classes", strong: true }]),
    ]);
    expect(stack.map((s) => `${s.name}:${s.confidence}`)).toEqual(["Next.js:detected", "Tailwind CSS:detected"]);
  });

  it("explains a Three.js scene in React and how to rebuild it", () => {
    const raw = page(
      [
        { name: "React", category: "framework", evidence: "React fiber on DOM nodes", strong: true },
        { name: "Three.js", category: "3d", evidence: 'canvas data-engine="three.js r183 webgpu"', version: "r183", strong: true },
        { name: "React Three Fiber", category: "3d", evidence: "Three.js inside a React app", strong: false },
      ],
      { count: 1, largestShare: 1, engines: ["three.js r183 webgpu"], aboveFold: true },
    );
    const scene = sceneOf([raw], stackOf([raw]))!;
    expect(scene).toMatchObject({ engine: "Three.js", version: "r183", renderer: "WebGPU", coverage: 1 });
    expect(scene.notes.join(" ")).toContain("fills the first screen");
    expect(scene.notes.join(" ")).toContain("`three` (0.183.x) with `@react-three/fiber`");
    expect(scene.notes.join(" ")).toContain("WebGPU or WebGL isn't available");
  });

  it("has no scene for a page without 3D or a large canvas", () => {
    const raw = page([], { count: 1, largestShare: 0.05 });
    expect(sceneOf([raw], [])).toBeNull();
  });

  it("names the craft details in plain words", () => {
    const list = detailsOf([page([], {}, { backdropBlur: 3, sticky: 1, fontFeatures: { cv01: 300, ss03: 300, "tabular-nums": 20 }, balancedText: 9, selection: { background: "rgb(13, 114, 104)", color: "rgb(255, 255, 255)" } })], []);
    const byTitle = Object.fromEntries(list.map((d) => [d.title, d.description]));
    expect(byTitle["Frosted glass"]).toMatch(/^3 surfaces blur/);
    expect(byTitle["Sticky elements"]).toMatch(/^1 element holds its place/);
    expect(byTitle["OpenType features"]).toContain("character variants cv01; stylistic set ss03; tabular figures");
    expect(byTitle["Selection colour"]).toBe("Selected text is rgb(255, 255, 255) on rgb(13, 114, 104) (::selection).");
  });

  it("is absent for pages measured before signals existed", () => {
    expect(siteProfile([{} as RawDesign])).toBeUndefined();
  });
});
