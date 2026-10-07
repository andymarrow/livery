"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "@/components/icons";
import { cn } from "@/lib/utils";

// The hero figure: real kits from the library restyle a mock app. Colours,
// radii and type weight are the kits' measured tokens (goatrank.lol and
// rize.roggy.site v1); the arrangements are illustrative of each site's
// layout. Every element glides to its new shape, so the page visibly
// rearranges as well as recolours.

type Box = { x: number; y: number; w: number; h: number; r?: "card" | "btn" | "round" | "bar"; o?: number };
type Layout = Record<string, Box>;

type Look = {
  id: string;
  domain: string;
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  card: number;
  button: number;
  layout: Layout;
};

// Mock elements in drawing order; card inner content flows with the card.
const ELEMENTS = ["logo", "n1", "n2", "n3", "navBtn", "h1", "h2", "p1", "p2", "btnA", "btnB", "card1", "card2", "card3"] as const;
const CARDS = new Set(["card1", "card2", "card3"]);

const BEFORE: Look = {
  id: "before",
  domain: "your app",
  bg: "#ffffff",
  surface: "#f1f5f9",
  line: "#e2e8f0",
  text: "#0f172a",
  muted: "#94a3b8",
  accent: "#2563eb",
  onAccent: "#ffffff",
  card: 6,
  button: 6,
  layout: {
    logo: { x: 5, y: 5, w: 5.5, h: 5.5, r: "btn" },
    n1: { x: 56, y: 7, w: 7, h: 1.6, r: "bar" },
    n2: { x: 66, y: 7, w: 7, h: 1.6, r: "bar" },
    n3: { x: 76, y: 7, w: 7, h: 1.6, r: "bar" },
    navBtn: { x: 86, y: 4.6, w: 9, h: 6.4, r: "btn" },
    h1: { x: 18, y: 19, w: 64, h: 5, r: "bar" },
    h2: { x: 28, y: 26, w: 44, h: 5, r: "bar" },
    p1: { x: 22, y: 35, w: 56, h: 1.8, r: "bar" },
    p2: { x: 32, y: 39, w: 36, h: 1.8, r: "bar" },
    btnA: { x: 36, y: 46, w: 13, h: 7, r: "btn" },
    btnB: { x: 51, y: 46, w: 13, h: 7, r: "btn" },
    card1: { x: 5, y: 62, w: 28.5, h: 31, r: "card" },
    card2: { x: 35.75, y: 62, w: 28.5, h: 31, r: "card" },
    card3: { x: 66.5, y: 62, w: 28.5, h: 31, r: "card" },
  },
};

const KITS: (Look & { y: number; swatches: string[]; wire: string; note: string })[] = [
  {
    id: "goatrank",
    domain: "goatrank.lol",
    bg: "#030303",
    surface: "#0a0a0c",
    line: "#1f1f22",
    text: "#fafafa",
    muted: "#a1a1a1",
    accent: "#ff7a00",
    onAccent: "#030303",
    card: 18,
    button: 999,
    y: 52,
    swatches: ["#030303", "#0a0a0c", "#262626", "#a1a1a1", "#ff7a00"],
    wire: "M182 118 L204 118 Q216 118 216 130 L216 228 Q216 240 228 240 L256 240",
    note: "r 18 · pill · Inter 700",
    layout: {
      logo: { x: 4, y: 5, w: 5, h: 5, r: "round" },
      n1: { x: 13, y: 6.6, w: 7, h: 1.6, r: "bar" },
      n2: { x: 22, y: 6.6, w: 7, h: 1.6, r: "bar" },
      n3: { x: 31, y: 6.6, w: 7, h: 1.6, r: "bar" },
      navBtn: { x: 80, y: 4, w: 16, h: 6.6, r: "btn" },
      h1: { x: 4, y: 18, w: 46, h: 5.5, r: "bar" },
      h2: { x: 4, y: 25.5, w: 34, h: 5.5, r: "bar" },
      p1: { x: 4, y: 34, w: 44, h: 1.8, r: "bar" },
      p2: { x: 4, y: 38, w: 30, h: 1.8, r: "bar" },
      btnA: { x: 4, y: 45, w: 15, h: 7, r: "btn" },
      btnB: { x: 21, y: 45, w: 12, h: 7, r: "btn" },
      card1: { x: 55, y: 16, w: 41, h: 38, r: "card" },
      card2: { x: 4, y: 58, w: 45, h: 36, r: "card" },
      card3: { x: 51, y: 58, w: 45, h: 36, r: "card" },
    },
  },
  {
    id: "rize",
    domain: "rize.roggy.site",
    bg: "#0a0a0b",
    surface: "#161617",
    line: "#2a2a2c",
    text: "#ffffff",
    muted: "#b6b5b6",
    accent: "#47ab61",
    onAccent: "#0a0a0b",
    card: 22,
    button: 999,
    y: 268,
    swatches: ["#0a0a0b", "#161617", "#e7e6e7", "#b6b5b6", "#47ab61"],
    wire: "M182 334 L204 334 Q216 334 216 322 L216 252 Q216 240 228 240 L256 240",
    note: "r 22 · pill · DM Sans 700",
    layout: {
      logo: { x: 4, y: 5, w: 6, h: 6, r: "round" },
      n1: { x: 56, y: 7.2, w: 7, h: 1.6, r: "bar" },
      n2: { x: 65, y: 7.2, w: 7, h: 1.6, r: "bar" },
      n3: { x: 74, y: 7.2, w: 7, h: 1.6, r: "bar" },
      navBtn: { x: 85, y: 4.4, w: 11, h: 7, r: "btn" },
      h1: { x: 4, y: 17, w: 74, h: 8, r: "bar" },
      h2: { x: 4, y: 27, w: 54, h: 8, r: "bar" },
      p1: { x: 4, y: 39, w: 42, h: 2, r: "bar" },
      p2: { x: 4, y: 43.5, w: 28, h: 2, r: "bar", o: 0 },
      btnA: { x: 4, y: 49, w: 20, h: 8, r: "btn" },
      btnB: { x: 26, y: 49, w: 8, h: 8, r: "round" },
      card1: { x: 4, y: 63, w: 92, h: 9.5, r: "card" },
      card2: { x: 4, y: 74, w: 92, h: 9.5, r: "card" },
      card3: { x: 4, y: 85, w: 92, h: 9.5, r: "card" },
    },
  },
];

const AREAS = ["tokens", "components", "layout"];
const HOLD_MS = 5200;
const TRAVEL_MS = 900;
const STAGE = { w: 680, h: 480 };
const pct = (value: number, of: number) => `${(value / of) * 100}%`;

function radius(box: Box, look: Look) {
  switch (box.r) {
    case "card":
      return `${Math.min(look.card, 16)}px`;
    case "btn":
      return look.button >= 999 ? "999px" : `${look.button}px`;
    case "round":
      return "999px";
    default:
      return "3px";
  }
}

function fill(id: string, look: Look) {
  if (id === "logo" || id === "btnA" || id === "navBtn") return look.accent;
  if (id === "h1" || id === "h2") return look.text;
  if (id === "btnB") return "transparent";
  if (CARDS.has(id)) return look.surface;
  return look.muted;
}

export function HeroFigure() {
  const [active, setActive] = useState(0);
  const [look, setLook] = useState<Look>(BEFORE);
  const [commits, setCommits] = useState(0);
  const [status, setStatus] = useState<"idle" | "applying" | "applied">("idle");
  const paused = useRef(false);
  const visible = useRef(true);
  const reduced = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const pulse = useRef<SVGCircleElement>(null);
  const wires = useRef<(SVGPathElement | null)[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const raf = useRef(0);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelAnimationFrame(raf.current);
  };

  const apply = useCallback((index: number) => {
    clear();
    const kit = KITS[index];
    setActive(index);
    setStatus("applying");
    setCommits(0);
    const path = wires.current[index];
    const dot = pulse.current;
    const finish = () => {
      setLook(kit);
      setStatus("applied");
      AREAS.forEach((_, i) => timers.current.push(setTimeout(() => setCommits(i + 1), 380 + i * 360)));
    };
    if (!path || !dot || reduced.current) {
      finish();
      return;
    }
    const length = path.getTotalLength();
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / TRAVEL_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const point = path.getPointAtLength(eased * length);
      dot.setAttribute("cx", String(point.x));
      dot.setAttribute("cy", String(point.y));
      dot.style.opacity = t < 0.06 || t > 0.94 ? String(Math.min(t, 1 - t) / 0.06) : "1";
      if (t < 1) raf.current = requestAnimationFrame(step);
      else {
        dot.style.opacity = "0";
        finish();
      }
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index = 0;
    let loop: ReturnType<typeof setInterval>;
    const first = setTimeout(() => {
      apply(0);
      loop = setInterval(() => {
        if (paused.current || !visible.current) return;
        index = (index + 1) % KITS.length;
        apply(index);
      }, HOLD_MS + TRAVEL_MS);
    }, 1400);
    const observer = new IntersectionObserver(([entry]) => (visible.current = entry.isIntersecting));
    if (stage.current) observer.observe(stage.current);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
      observer.disconnect();
      clear();
    };
  }, [apply]);

  const kit = KITS[active];
  const applied = look.id !== "before";

  return (
    <figure className="w-full select-none" aria-label="Design kits from the Livery library restyling the same app: colours, shapes and layout change">
      <div
        ref={stage}
        className="relative w-full"
        style={{ aspectRatio: `${STAGE.w} / ${STAGE.h}`, containerType: "inline-size" }}
        onPointerEnter={() => (paused.current = true)}
        onPointerLeave={() => (paused.current = false)}
      >
        {KITS.map((k, i) => {
          const on = i === active;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => apply(i)}
              aria-pressed={on}
              className={cn(
                "group/kit absolute flex flex-col justify-between rounded-[14px] border bg-surface p-[2.2%] text-left shadow-card transition-[opacity,border-color,transform] duration-300 ease-out-soft hover:-translate-y-0.5",
                on ? "border-accent opacity-100" : "border-border opacity-55 hover:opacity-90",
              )}
              style={{ left: 0, top: pct(k.y, STAGE.h), width: pct(182, STAGE.w), height: pct(132, STAGE.h) }}
            >
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 shrink-0 rounded-full transition-transform duration-300 group-hover/kit:scale-125" style={{ background: k.accent }} />
                <span className="truncate font-mono text-[clamp(9px,1.65cqw,12px)] font-medium text-fg">{k.domain}</span>
              </span>
              <span className="font-mono text-[clamp(8px,1.35cqw,10px)] uppercase tracking-wide text-fg-subtle">kit v1 · levels 1–3</span>
              <span className="flex gap-1">
                {k.swatches.map((c, s) => (
                  <span
                    key={c}
                    className="aspect-square flex-1 rounded-[4px] border border-border transition-transform duration-300 ease-out-soft group-hover/kit:-translate-y-0.5"
                    style={{ background: c, transitionDelay: `${s * 30}ms` }}
                  />
                ))}
              </span>
              <span className="truncate font-mono text-[clamp(8px,1.35cqw,10px)] text-fg-subtle">{k.note}</span>
            </button>
          );
        })}

        <svg viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {KITS.map((k, i) => {
            const on = i === active;
            return (
              <g key={k.id} className="transition-opacity duration-300" style={{ opacity: on ? 1 : 0.35 }}>
                <path
                  ref={(el) => {
                    wires.current[i] = el;
                  }}
                  d={k.wire}
                  fill="none"
                  stroke={on ? "var(--accent)" : "var(--border-strong)"}
                  strokeWidth={1.25}
                  strokeDasharray={on ? undefined : "3 4"}
                  className="transition-[stroke] duration-300"
                />
                <circle cx={182} cy={k.y + 66} r={3.2} fill="var(--surface)" stroke={on ? "var(--accent)" : "var(--border-strong)"} strokeWidth={1.25} />
              </g>
            );
          })}
          <circle cx={256} cy={240} r={3.2} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.25} />
          <circle ref={pulse} r={4} fill="var(--accent)" style={{ opacity: 0 }} />
        </svg>

        {/* The app being restyled */}
        <div
          className="absolute flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface shadow-raised"
          style={{ left: pct(256, STAGE.w), top: 0, width: pct(STAGE.w - 256, STAGE.w), height: "100%" }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-[3.5%] py-[2.4%]">
            <span className="truncate font-mono text-[clamp(8px,1.45cqw,11px)] text-fg-muted">your-app.com</span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[clamp(8px,1.35cqw,10px)] transition-colors duration-300",
                status === "applied" ? "bg-accent-soft text-accent-soft-fg" : "bg-surface-2 text-fg-subtle",
              )}
              aria-live="polite"
            >
              {status === "applied" ? <Check className="size-2.5" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-current animate-pulse-dot" />}
              {status === "idle" ? "waiting for a kit" : status === "applying" ? `applying ${kit.domain}` : `${kit.domain} v1 applied`}
            </span>
          </div>

          <div className="relative flex-1 transition-colors duration-700 ease-out-soft" style={{ background: look.bg }}>
            {ELEMENTS.map((id, order) => {
              const box = look.layout[id];
              const isCard = CARDS.has(id);
              return (
                <span
                  key={id}
                  className="absolute overflow-hidden transition-[left,top,width,height,border-radius,background-color,border-color,opacity] duration-700 ease-out-soft"
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`,
                    borderRadius: radius(box, look),
                    background: fill(id, look),
                    opacity: box.o ?? (id.startsWith("n") || id.startsWith("p") ? 0.6 : 1),
                    border: isCard || id === "btnB" ? `1px solid ${look.line}` : undefined,
                    transitionDelay: `${order * 28}ms`,
                  }}
                >
                  {isCard && (
                    <span className="flex h-full flex-col justify-between p-[7%]">
                      <span className="flex items-center gap-[6%]">
                        <span className="aspect-square h-[clamp(6px,1.6cqw,12px)] shrink-0 rounded-full transition-colors duration-700" style={{ background: look.accent, opacity: 0.85 }} />
                        <span className="h-[clamp(3px,0.7cqw,5px)] w-1/2 rounded-full transition-colors duration-700" style={{ background: look.muted, opacity: 0.7 }} />
                      </span>
                      <span className="h-[clamp(3px,0.7cqw,5px)] w-full overflow-hidden rounded-full" style={{ background: look.line }}>
                        <span
                          className="block h-full rounded-full transition-[width,background-color] duration-700 ease-out-soft"
                          style={{ width: `${applied ? 35 + order * 4 : 28}%`, background: look.accent, transitionDelay: `${200 + order * 40}ms` }}
                        />
                      </span>
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          <div className="border-t border-border px-[3.5%] py-[2%] font-mono text-[clamp(8px,1.4cqw,10.5px)] leading-[1.9]">
            {AREAS.map((area, i) => (
              <p
                key={area}
                className={cn("flex items-center gap-1.5 truncate transition-[opacity,transform] duration-300 ease-out-soft", i < commits ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0")}
              >
                <Check className="size-3 shrink-0 text-accent-ink" strokeWidth={2.5} />
                <span className="text-fg-subtle">{(0x9f2c1a + i * 0x1b3c5 + active * 0x41).toString(16).slice(0, 7)}</span>
                <span className="truncate text-fg-muted">
                  livery({kit.domain} v1): {area}
                </span>
              </p>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wide">
        <span className="text-fg-subtle">Click a kit · measured tokens, illustrative layout</span>
        <span className="truncate normal-case text-fg-muted tabular">
          {commits} of {AREAS.length} commits
        </span>
      </figcaption>
    </figure>
  );
}
