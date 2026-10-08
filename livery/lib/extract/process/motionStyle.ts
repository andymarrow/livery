import type { MotionUse, RawDesign } from "../collect/collectDesign";

// A site's motion style, read from the animations it actually runs: what kind
// of motion each one is (typing, line drawing, a rotating list...), how long
// it takes, how it eases, whether it loops or staggers, and what starts it.
// Deterministic: everything comes from keyframes and measured timing.

export type MotionKind =
  | "typewriter"
  | "line-draw"
  | "clip-reveal"
  | "marquee"
  | "cycle"
  | "blink"
  | "pulse"
  | "spin"
  | "shake"
  | "shimmer"
  | "float"
  | "enter"
  | "exit"
  | "other";

export type MotionSignature = {
  kind: MotionKind;
  label: string;
  /** One plain sentence with the measured numbers. */
  description: string;
  /** Elements moving this way. */
  count: number;
  durationMs: number;
  easing: string;
  loops: boolean;
  /** Gap between staggered starts, when there is a stagger. */
  staggerMs: number | null;
  trigger: MotionUse["trigger"];
  targets: string[];
  /** One real example: its name, the CSS shorthand that runs it, and its keyframes. */
  example: { name: string; animation: string; keyframes: string };
};

export type Interactions = {
  /** What hovering changes, most common first, with each property's share of hover rules. */
  hover: { change: string; share: number }[];
  hoverRules: number;
  /** Animations started by hover, focus, a state change or scrolling (site's own first). */
  triggered: { name: string; kind: MotionKind; trigger: MotionUse["trigger"]; durationMs: number; easing: string }[];
  reducedMotion: boolean;
  lineArt: boolean;
};

// Animation names from UI and docs libraries: they describe the library, not the designer.
const LIBRARY = /^(fd|radix|rdx|headlessui|chakra|mantine|omni|vaul|sonner|cmdk|tippy|swal|nprogress|toastify|mui|ant|el|v)-/i;

export function isLibraryAnimation(name: string) {
  return LIBRARY.test(name);
}

const has = (css: string, re: RegExp) => re.test(css);

/** What kind of motion one animation is. */
export function classify(a: Pick<MotionUse, "name" | "keyframes" | "durationMs" | "iterations" | "easing" | "count" | "delaysMs">): MotionKind {
  const k = a.keyframes.toLowerCase();
  const loops = a.iterations === "infinite";
  // A hard switch: a steps() easing, or two keyframe stops a hair apart (48% then 49%).
  const stops = [...k.matchAll(/(\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1])).sort((x, y) => x - y);
  const hardSteps = /steps?\(|step-(end|start)/.test(`${a.easing} ${k}`) || stops.some((v, i) => i > 0 && v - stops[i - 1] > 0 && v - stops[i - 1] <= 1.01);
  const opacityOnly = has(k, /opacity/) && !has(k, /transform|translate|scale|rotate|width|height|clip-path|stroke|background/);
  if (has(k, /stroke-dashoffset/)) return "line-draw";
  if (has(k, /width/) && (has(k, /steps\(/) || has(k, /\dch\b/))) return "typewriter";
  if (has(k, /clip-path/)) return "clip-reveal";
  if (loops && a.durationMs >= 8000 && has(k, /translate[xy]?\(\s*-?(50|100)%/)) return "marquee";
  if (has(k, /background-position/)) return "shimmer";
  if (has(k, /rotate\(\s*(360deg|1turn)/)) return "spin";
  if (opacityOnly && loops && a.durationMs <= 1600 && hardSteps) return "blink";
  if (loops && a.count >= 3 && new Set(a.delaysMs).size >= 3 && has(k, /opacity|translate|transform/)) return "cycle";
  if (loops && a.count >= 3 && has(k, /opacity/) && has(k, /translate/) && /\b100%[^{]*\{[^}]*opacity:\s*0/.test(k)) return "cycle";
  if (!loops && (k.match(/translate\(\s*-?\d+(\.\d+)?px/g) ?? []).length >= 2 && a.durationMs <= 800) return "shake";
  if (loops && (opacityOnly || has(k, /scale/)) && has(k, /50%/)) return "pulse";
  if (loops && has(k, /translatey|translate\(0(px)?,/) && /ease-in-out/.test(a.easing)) return "float";
  if (loops && has(k, /scale|opacity/)) return "pulse";
  if (loops && has(k, /translate/)) return "float";
  if (!loops && /(^|\s|\{)(0%|from)[^{]*\{[^}]*(opacity:\s*0|transform|translate|scale)/.test(k)) return "enter";
  if (!loops && /(100%|to)[^{]*\{[^}]*opacity:\s*0/.test(k)) return "exit";
  if (opacityOnly && loops && hardSteps) return "blink";
  return "other";
}

const LABELS: Record<MotionKind, string> = {
  typewriter: "Typing text",
  "line-draw": "Line drawing",
  "clip-reveal": "Wipe reveal",
  marquee: "Endless rail",
  cycle: "Rotating list",
  blink: "Hard blink",
  pulse: "Pulse",
  spin: "Spinner",
  shake: "Refusal shake",
  shimmer: "Shimmer",
  float: "Float",
  enter: "Entrance",
  exit: "Exit",
  other: "Custom animation",
};

const seconds = (ms: number) => (ms >= 1000 ? `${+(ms / 1000).toFixed(ms % 1000 ? 1 : 0)}s` : `${ms}ms`);

function staggerOf(delays: number[]) {
  const sorted = [...new Set(delays)].sort((a, b) => a - b);
  if (sorted.length < 3) return null;
  const gaps = sorted.slice(1).map((d, i) => d - sorted[i]).filter((g) => g > 0);
  if (!gaps.length) return null;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

// How an entrance or exit moves, from its keyframes.
function movement(keyframes: string) {
  const k = keyframes.toLowerCase();
  const parts = [/opacity/.test(k) ? "fade" : "", /scale/.test(k) ? "scale" : "", /translatey\(|translate\(0(px)?,|translate3d\(0/.test(k) ? "vertical slide" : /translatex?\(/.test(k) ? "slide" : "", /blur/.test(k) ? "blur" : ""].filter(Boolean);
  return parts.length ? parts.join(" and ") : "change";
}

function describe(kind: MotionKind, s: { count: number; durationMs: number; easing: string; loops: boolean; staggerMs: number | null; targets: string[]; partners: number; keyframes: string }) {
  const ease = s.easing && s.easing !== "linear" && s.easing !== "ease" ? ` with ${s.easing}` : "";
  const stagger = s.staggerMs ? `, staggered ${seconds(s.staggerMs)} apart` : "";
  const loop = s.loops ? `, looping every ${seconds(s.durationMs)}` : "";
  switch (kind) {
    case "typewriter":
      return `Text types itself in character by character (steps()), holds, then clears${loop}${s.partners ? `, choreographed with ${s.partners} other animation${s.partners > 1 ? "s" : ""} on the same clock` : ""}.`;
    case "line-draw":
      return `${s.targets.some((t) => t.startsWith("svg")) ? "SVG lines" : "Lines"} draw themselves in over ${seconds(s.durationMs)}${ease}${stagger}.`;
    case "clip-reveal":
      return `Content is wiped into view with clip-path${s.loops ? `, on a ${seconds(s.durationMs)} loop` : ` over ${seconds(s.durationMs)}`}.`;
    case "marquee":
      return `A strip scrolls sideways forever, one pass every ${seconds(s.durationMs)}, linear.`;
    case "cycle":
      return `${s.count} items take turns: each fades and rises in, holds, then leaves${loop}${stagger}.`;
    case "blink":
      return `Switches hard on and off every ${seconds(s.durationMs)}, no fade (cursors and carets).`;
    case "pulse":
      return `Breathes in opacity or scale every ${seconds(s.durationMs)}${ease}.`;
    case "spin":
      return `Turns a full circle every ${seconds(s.durationMs)}${ease}.`;
    case "shake":
      return `Shakes side to side over ${seconds(s.durationMs)} to say no.`;
    case "shimmer":
      return `A highlight sweeps across${s.loops ? ` every ${seconds(s.durationMs)}` : ""}.`;
    case "float":
      return `Drifts gently up and down every ${seconds(s.durationMs)}${ease}.`;
    case "enter":
      return `Arrives with a ${movement(s.keyframes)} over ${seconds(s.durationMs)}${ease}${stagger}.`;
    case "exit":
      return `Leaves with a ${movement(s.keyframes)} over ${seconds(s.durationMs)}${ease}.`;
    default:
      return `Runs over ${seconds(s.durationMs)}${ease}${loop}.`;
  }
}

function shorthand(a: MotionUse, staggerMs: number | null) {
  const iterations = a.iterations === "infinite" ? " infinite" : a.iterations > 1 ? ` ${a.iterations}` : "";
  const fill = a.iterations === "infinite" ? "" : " both";
  return `animation: ${a.name} ${a.durationMs}ms ${a.easing || "ease"}${iterations}${fill};${staggerMs ? ` /* + ${staggerMs}ms delay per item */` : ""}`;
}

const RANK: MotionKind[] = ["typewriter", "line-draw", "cycle", "marquee", "clip-reveal", "shake", "shimmer", "float", "blink", "pulse", "spin", "enter", "exit", "other"];

/** The site's signature motions: its own animations (not a library's), one per kind. */
/** The same animation seen at several screen widths (or one capture standing in for all three) counts once. */
function byName(raws: RawDesign[]) {
  const merged = new Map<string, MotionUse>();
  for (const a of raws.flatMap((r) => r.motionUse?.animations ?? [])) {
    const seen = merged.get(a.name);
    merged.set(a.name, !seen ? a : { ...seen, count: Math.max(seen.count, a.count), delaysMs: [...new Set([...seen.delaysMs, ...a.delaysMs])].sort((x, y) => x - y).slice(0, 12), targets: [...new Set([...seen.targets, ...a.targets])].slice(0, 4), keyframes: seen.keyframes || a.keyframes, trigger: seen.trigger === "load" ? seen.trigger : a.trigger });
  }
  return [...merged.values()];
}

export function motionSignatures(raws: RawDesign[]): MotionSignature[] {
  const uses = byName(raws).filter((a) => a.keyframes && a.durationMs > 0 && !isLibraryAnimation(a.name));
  // Animations sharing one long looping clock are parts of one choreography.
  const clocks = new Map<number, number>();
  for (const a of uses) if (a.iterations === "infinite" && a.durationMs >= 2000) clocks.set(a.durationMs, (clocks.get(a.durationMs) ?? 0) + 1);

  // An on/off opacity switch on a shared clock (a cursor shown only while typing) is part of that sequence, not a motion of its own.
  const visibilitySwitch = (a: MotionUse) => a.iterations === "infinite" && (clocks.get(a.durationMs) ?? 0) >= 2 && /opacity/.test(a.keyframes) && !/transform|translate|scale|rotate|width|height|clip-path|stroke|background/.test(a.keyframes);

  const byKind = new Map<MotionKind, { uses: MotionUse[]; best: MotionUse }>();
  for (const a of uses) {
    if (visibilitySwitch(a)) continue;
    const kind = classify(a);
    const entry = byKind.get(kind);
    if (!entry) byKind.set(kind, { uses: [a], best: a });
    else {
      entry.uses.push(a);
      if (a.count > entry.best.count || (a.trigger === "load" && entry.best.trigger !== "load")) entry.best = a;
    }
  }
  return [...byKind.entries()]
    .filter(([kind]) => kind !== "other" || byKind.size <= 2)
    .map(([kind, { uses: group, best }]) => {
      const count = group.reduce((n, a) => n + a.count, 0);
      const staggerMs = staggerOf(best.delaysMs);
      const loops = best.iterations === "infinite";
      const partners = loops ? Math.max(0, (clocks.get(best.durationMs) ?? 1) - 1) : 0;
      const targets = [...new Set(group.flatMap((a) => a.targets))].slice(0, 3);
      return {
        kind,
        label: LABELS[kind],
        description: describe(kind, { count, durationMs: best.durationMs, easing: best.easing, loops, staggerMs, targets, partners, keyframes: best.keyframes }),
        count,
        durationMs: best.durationMs,
        easing: best.easing,
        loops,
        staggerMs,
        trigger: best.trigger,
        targets,
        example: { name: best.name, animation: shorthand(best, staggerMs), keyframes: best.keyframes.slice(0, 900) },
      };
    })
    .sort((a, b) => RANK.indexOf(a.kind) - RANK.indexOf(b.kind))
    .slice(0, 8);
}

const HOVER_NAMES: Record<string, string> = {
  color: "text colour",
  "background-color": "background colour",
  background: "background",
  border: "border",
  "border-color": "border colour",
  opacity: "opacity",
  transform: "position or scale",
  "box-shadow": "shadow",
  outline: "outline",
  stroke: "stroke",
  fill: "fill",
  filter: "filter",
  "text-decoration-color": "underline",
  "text-decoration-line": "underline",
  "text-decoration-thickness": "underline",
  "text-decoration-style": "underline",
  "text-underline-offset": "underline",
};

/** How the site responds to people: hover changes and triggered animations. */
export function interactions(raws: RawDesign[]): Interactions {
  const hover: Record<string, number> = {};
  let hoverRules = 0;
  for (const r of raws) {
    hoverRules = Math.max(hoverRules, r.motionUse?.hoverRules ?? 0);
    // A rule changing several underline properties counts once.
    for (const [prop, n] of Object.entries(r.motionUse?.hover ?? {})) {
      const change = HOVER_NAMES[prop];
      if (change) hover[change] = Math.max(hover[change] ?? 0, n);
    }
  }
  const triggered = byName(raws)
    .filter((a) => a.trigger !== "load" && a.keyframes)
    .sort((a, b) => Number(isLibraryAnimation(a.name)) - Number(isLibraryAnimation(b.name)) || b.count - a.count);
  const seen = new Set<string>();
  return {
    hover: Object.entries(hover)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([change, n]) => ({ change, share: hoverRules ? Math.min(1, Math.round((n / hoverRules) * 100) / 100) : 0 })),
    hoverRules,
    triggered: triggered
      .filter((a) => !seen.has(a.name) && seen.add(a.name))
      .slice(0, 8)
      .map((a) => ({ name: a.name, kind: classify(a), trigger: a.trigger, durationMs: a.durationMs, easing: a.easing })),
    reducedMotion: raws.some((r) => r.motionUse?.reducedMotion),
    lineArt: raws.some((r) => (r.motionUse?.lineArt.svgs ?? 0) >= 2 || (r.motionUse?.lineArt.hairline ?? 0) >= 3),
  };
}
