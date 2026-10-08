import { describe, expect, it } from "vitest";
import type { MotionUse, RawDesign } from "@/lib/extract/collect/collectDesign";
import { classify, interactions, isLibraryAnimation, motionSignatures } from "@/lib/extract/process/motionStyle";

// Real keyframes from farmjs.dev, measured 2026-10-08.
const FARM = {
  type: "@keyframes farm-terminal-command-type { 0% { opacity: 1; width: 0px; } 2% { opacity: 1; width: 0px; animation-timing-function: steps(8); } 7%, 88% { opacity: 1; width: 8ch; } 94%, 99.99% { opacity: 0; width: 8ch; } 100% { opacity: 1; width: 0px; } }",
  blink: "@keyframes farm-terminal-cursor-blink { 0%, 48% { opacity: 1; } 49%, 100% { opacity: 0; } }",
  window: "@keyframes farm-terminal-cursor-window { 0%, 12% { opacity: 1; } 12.01%, 100% { opacity: 0; } }",
  output: "@keyframes farm-terminal-output { 0%, 12% { clip-path: inset(0px 0px 100%); opacity: 1; animation-timing-function: steps(6, start); } 68%, 88% { clip-path: inset(0px); opacity: 1; } 94%, 99.99% { clip-path: inset(0px); opacity: 0; } 100% { clip-path: inset(0px 0px 100%); opacity: 1; } }",
  draw: "@keyframes farm-route-draw { 100% { stroke-dashoffset: 0; } }",
  rail: "@keyframes farm-logo-rail { 0% { transform: translate(0px, 0px); } 100% { transform: translate(-50%); } }",
  cycle: "@keyframes benchmark-comparison-cycle { 0% { opacity: 0; transform: translateY(46%); } 4%, 22% { opacity: 1; transform: translate(0px, 0px); } 25%, 100% { opacity: 0; transform: translateY(-42%); } }",
  refuse: "@keyframes iso-refuse { 20%, 60% { transform: translate(-1.5px); } 40%, 80% { transform: translate(1.5px); } }",
  dialog: "@keyframes fd-dialog-in { 0% { opacity: 0; transform: scale(1.06); } 100% { transform: scale(1); } }",
};

const use = (name: string, keyframes: string, o: Partial<MotionUse> = {}): MotionUse => ({ name, keyframes, count: 1, durationMs: 1000, delaysMs: [0], iterations: 1, easing: "ease", trigger: "load", targets: ["block"], ...o });

function raw(animations: MotionUse[], extra: Partial<NonNullable<RawDesign["motionUse"]>> = {}) {
  return { motionUse: { animations, hover: {}, hoverRules: 0, reducedMotion: false, lineArt: { svgs: 0, hairline: 0 }, ...extra } } as unknown as RawDesign;
}

describe("motion style", () => {
  it("names each kind of motion from its keyframes and timing", () => {
    expect(classify(use("t", FARM.type, { durationMs: 9600, iterations: "infinite" }))).toBe("typewriter");
    expect(classify(use("b", FARM.blink, { durationMs: 800, iterations: "infinite", easing: "linear" }))).toBe("blink");
    expect(classify(use("o", FARM.output, { durationMs: 9600, iterations: "infinite" }))).toBe("clip-reveal");
    expect(classify(use("d", FARM.draw, { durationMs: 520 }))).toBe("line-draw");
    expect(classify(use("r", FARM.rail, { durationMs: 96000, iterations: "infinite", easing: "linear" }))).toBe("marquee");
    expect(classify(use("c", FARM.cycle, { durationMs: 12000, iterations: "infinite", count: 32, delaysMs: [0, 3000, 6000, 9000] }))).toBe("cycle");
    expect(classify(use("x", FARM.refuse, { durationMs: 450 }))).toBe("shake");
    expect(classify(use("e", FARM.dialog, { durationMs: 200 }))).toBe("enter");
    expect(classify(use("s", "@keyframes s { to { transform: rotate(360deg); } }", { iterations: "infinite" }))).toBe("spin");
  });

  it("describes the site's own signatures with measured numbers, and leaves library animations out", () => {
    const signatures = motionSignatures([
      raw([
        use("farm-route-draw", FARM.draw, { count: 9, durationMs: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)", delaysMs: [0, 70, 140, 210, 280], targets: ["svg path"] }),
        use("benchmark-comparison-cycle", FARM.cycle, { count: 32, durationMs: 12000, iterations: "infinite", delaysMs: [0, 3000, 6000, 9000], targets: ["list item"] }),
        use("farm-terminal-command-type", FARM.type, { durationMs: 9600, iterations: "infinite" }),
        use("farm-terminal-cursor-window", FARM.window, { durationMs: 9600, iterations: "infinite", easing: "linear" }),
        use("fd-dialog-in", FARM.dialog, { durationMs: 200, trigger: "state" }),
      ]),
    ]);
    expect(signatures.map((s) => s.kind)).toEqual(["typewriter", "line-draw", "cycle"]);
    const draw = signatures.find((s) => s.kind === "line-draw")!;
    expect(draw.description).toBe("SVG lines draw themselves in over 520ms with cubic-bezier(0.22, 1, 0.36, 1), staggered 70ms apart.");
    expect(draw.example.animation).toContain("farm-route-draw 520ms cubic-bezier(0.22, 1, 0.36, 1) both");
    expect(signatures.find((s) => s.kind === "cycle")!.description).toMatch(/^32 items take turns.*every 12s, staggered 3s apart\.$/);
    expect(signatures.find((s) => s.kind === "typewriter")!.description).toContain("choreographed with 1 other animation");
    expect(isLibraryAnimation("fd-dialog-in")).toBe(true);
    expect(isLibraryAnimation("farm-route-draw")).toBe(false);
  });

  it("sums up hover changes, triggered animations, line art and reduced motion", () => {
    const io = interactions([
      raw([use("iso-refuse", FARM.refuse, { durationMs: 450, trigger: "state" }), use("fd-dialog-in", FARM.dialog, { durationMs: 200, trigger: "state" })], {
        hover: { color: 60, "background-color": 40, "text-decoration-color": 10, transform: 5 },
        hoverRules: 100,
        reducedMotion: true,
        lineArt: { svgs: 3, hairline: 4 },
      }),
    ]);
    expect(io.hover[0]).toEqual({ change: "text colour", share: 0.6 });
    expect(io.triggered.map((t) => t.name)).toEqual(["iso-refuse", "fd-dialog-in"]);
    expect(io.triggered[0].kind).toBe("shake");
    expect(io.reducedMotion).toBe(true);
    expect(io.lineArt).toBe(true);
  });

  it("counts an animation once when the same page is measured at three widths", () => {
    const page = raw([use("benchmark-comparison-cycle", FARM.cycle, { count: 32, durationMs: 12000, iterations: "infinite", delaysMs: [0, 3000, 6000, 9000] })]);
    const [cycle] = motionSignatures([page, page, page]);
    expect(cycle.count).toBe(32);
    expect(cycle.description).toMatch(/^32 items/);
  });

  it("is empty for pages measured before motion was collected", () => {
    const old = {} as RawDesign;
    expect(motionSignatures([old])).toEqual([]);
    expect(interactions([old]).hover).toEqual([]);
  });
});
