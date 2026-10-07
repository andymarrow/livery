"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "@/components/icons";
import { cn } from "@/lib/utils";

// The hero figure: two real kits from the library restyle a mock app.
// Values are the kits' measured tokens (goatrank.lol and rize.roggy.site v1).
// Drawn on a fixed 640×420 stage; HTML panels and SVG wires share coordinates.

type Look = {
  id: string;
  label: string;
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  card: number;
  button: number;
  weight: number;
  tracking: string;
};

const BEFORE: Look = {
  id: "before",
  label: "your app, before",
  bg: "#ffffff",
  surface: "#f1f5f9",
  line: "#e2e8f0",
  text: "#0f172a",
  muted: "#94a3b8",
  accent: "#2563eb",
  onAccent: "#ffffff",
  card: 6,
  button: 6,
  weight: 600,
  tracking: "0em",
};

const KITS: (Look & { domain: string; y: number; swatches: string[]; wire: string })[] = [
  {
    id: "goatrank",
    domain: "goatrank.lol",
    label: "goatrank.lol v1",
    bg: "#030303",
    surface: "#0a0a0c",
    line: "#1f1f22",
    text: "#fafafa",
    muted: "#a1a1a1",
    accent: "#ff7a00",
    onAccent: "#030303",
    card: 18,
    button: 999,
    weight: 700,
    tracking: "-0.025em",
    y: 44,
    swatches: ["#030303", "#0a0a0c", "#262626", "#a1a1a1", "#ff7a00"],
    wire: "M178 110 L198 110 Q210 110 210 122 L210 198 Q210 210 222 210 L250 210",
  },
  {
    id: "rize",
    domain: "rize.roggy.site",
    label: "rize.roggy.site v1",
    bg: "#0a0a0b",
    surface: "#161617",
    line: "#2a2a2c",
    text: "#ffffff",
    muted: "#b6b5b6",
    accent: "#47ab61",
    onAccent: "#0a0a0b",
    card: 22,
    button: 999,
    weight: 700,
    tracking: "-0.01em",
    y: 244,
    swatches: ["#0a0a0b", "#161617", "#e7e6e7", "#b6b5b6", "#47ab61"],
    wire: "M178 310 L198 310 Q210 310 210 298 L210 222 Q210 210 222 210 L250 210",
  },
];

const AREAS = ["tokens", "components", "layout"];
const HOLD_MS = 4600;
const TRAVEL_MS = 900;

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

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

  // Moves the pulse along the active wire, then applies the kit.
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
      AREAS.forEach((_, i) => timers.current.push(setTimeout(() => setCommits(i + 1), 260 + i * 320)));
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

  // The loop: hold each kit, then hand over to the next. Pauses on hover and off screen.
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
    }, 900);
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
  const vars = {
    "--m-bg": look.bg,
    "--m-surface": look.surface,
    "--m-line": look.line,
    "--m-text": look.text,
    "--m-muted": look.muted,
    "--m-accent": look.accent,
    "--m-on": look.onAccent,
    "--m-card": `${Math.min(look.card, 20)}px`,
    "--m-btn": `${look.button}px`,
  } as React.CSSProperties;

  return (
    <figure className="w-full select-none" aria-label="Two design kits from the Livery library restyling the same app, one after the other">
      <div
        ref={stage}
        className="relative w-full"
        style={{ aspectRatio: "640 / 420", containerType: "inline-size" }}
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
                "absolute flex flex-col justify-between rounded-[14px] border bg-surface p-[2.2%] text-left shadow-card transition-[opacity,border-color,transform] duration-300 ease-out-soft",
                on ? "border-accent opacity-100" : "border-border opacity-55 hover:opacity-90",
              )}
              style={{ left: 0, top: pct(k.y, 420), width: pct(178, 640), height: pct(132, 420) }}
            >
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: k.accent }} />
                <span className="truncate font-mono text-[clamp(9px,1.7cqw,12px)] font-medium text-fg">{k.domain}</span>
              </span>
              <span className="font-mono text-[clamp(8px,1.4cqw,10px)] uppercase tracking-wide text-fg-subtle">kit v1 · levels 1–3</span>
              <span className="flex gap-1">
                {k.swatches.map((c) => (
                  <span key={c} className="aspect-square flex-1 rounded-[4px] border border-border" style={{ background: c }} />
                ))}
              </span>
              <span className="flex items-baseline justify-between">
                <span className="text-[clamp(13px,2.6cqw,18px)] leading-none text-fg" style={{ fontWeight: k.weight, letterSpacing: k.tracking }}>
                  Aa
                </span>
                <span className="font-mono text-[clamp(8px,1.4cqw,10px)] text-fg-subtle">r {k.card}px · pill</span>
              </span>
            </button>
          );
        })}

        <svg viewBox="0 0 640 420" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
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
                <circle cx={178} cy={k.y + 66} r={3.2} fill="var(--surface)" stroke={on ? "var(--accent)" : "var(--border-strong)"} strokeWidth={1.25} />
              </g>
            );
          })}
          <circle cx={250} cy={210} r={3.2} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.25} />
          <circle ref={pulse} r={4} fill="var(--accent)" style={{ opacity: 0 }} />
        </svg>

        {/* The app being restyled */}
        <div
          className="absolute flex flex-col overflow-hidden rounded-[16px] border border-border bg-surface shadow-raised"
          style={{ left: pct(250, 640), top: 0, width: pct(390, 640), height: "100%" }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-[3.5%] py-[2.2%]">
            <span className="truncate font-mono text-[clamp(8px,1.5cqw,11px)] text-fg-muted">your-app · /dashboard</span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[clamp(8px,1.4cqw,10px)] transition-colors duration-300",
                status === "applied" ? "bg-accent-soft text-accent-soft-fg" : "bg-surface-2 text-fg-subtle",
              )}
              aria-live="polite"
            >
              {status === "applied" ? <Check className="size-2.5" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-current animate-pulse-dot" />}
              {status === "idle" ? "waiting for a kit" : status === "applying" ? `applying ${kit.label}` : `${kit.label} applied`}
            </span>
          </div>

          {/* Mock UI: bars stand in for text, like Livery's content-removed frames. */}
          <div className="relative flex-1 p-[4%] transition-colors duration-500 ease-out-soft" style={{ ...vars, background: "var(--m-bg)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-4 transition-[background-color,border-radius] duration-500" style={{ background: "var(--m-accent)", borderRadius: "calc(var(--m-card) / 3)" }} />
                {[34, 26, 30].map((w) => (
                  <span key={w} className="h-1.5 rounded-full transition-colors duration-500" style={{ width: `${w}px`, background: "var(--m-muted)", opacity: 0.55 }} />
                ))}
              </div>
              <span className="h-[18px] w-14 transition-[background-color,border-radius] duration-500" style={{ background: "var(--m-accent)", borderRadius: "var(--m-btn)" }} />
            </div>

            <div className="mt-[7%] space-y-2">
              <span className="block h-3.5 w-[62%] rounded-[3px] transition-colors duration-500" style={{ background: "var(--m-text)" }} />
              <span className="block h-3.5 w-[44%] rounded-[3px] transition-colors duration-500" style={{ background: "var(--m-text)" }} />
              <span className="mt-3 block h-1.5 w-[70%] rounded-full transition-colors duration-500" style={{ background: "var(--m-muted)", opacity: 0.6 }} />
              <span className="block h-1.5 w-[52%] rounded-full transition-colors duration-500" style={{ background: "var(--m-muted)", opacity: 0.6 }} />
            </div>

            <div className="mt-[6%] flex items-center gap-2">
              <span
                className="inline-flex h-7 items-center px-3 font-semibold transition-[background-color,border-radius,color] duration-500"
                style={{ background: "var(--m-accent)", color: "var(--m-on)", borderRadius: "var(--m-btn)", fontSize: 10 }}
              >
                Get started
              </span>
              <span className="h-7 w-16 border transition-[border-color,border-radius] duration-500" style={{ borderColor: "var(--m-line)", borderRadius: "var(--m-btn)" }} />
            </div>

            <div className="mt-[7%] grid grid-cols-2 gap-2">
              {[0.72, 0.46].map((fill, i) => (
                <div
                  key={i}
                  className="border p-2.5 transition-[background-color,border-color,border-radius] duration-500"
                  style={{ background: "var(--m-surface)", borderColor: "var(--m-line)", borderRadius: "var(--m-card)" }}
                >
                  <span className="block h-1.5 w-1/2 rounded-full transition-colors duration-500" style={{ background: "var(--m-muted)", opacity: 0.7 }} />
                  <span className="mt-2 block h-2.5 w-3/4 rounded-[3px] transition-colors duration-500" style={{ background: "var(--m-text)" }} />
                  <span className="mt-3 block h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--m-line)" }}>
                    <span className="block h-full rounded-full transition-[background-color,width] duration-700 ease-out-soft" style={{ width: `${look.id === "before" ? 30 : fill * 100}%`, background: "var(--m-accent)" }} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Commit log: one commit per area, as every kit's flow requires */}
          <div className="border-t border-border px-[3.5%] py-[2%] font-mono text-[clamp(8px,1.45cqw,10.5px)] leading-[1.9]">
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
        <span className="text-fg-subtle">Click a kit</span>
        <span className="truncate normal-case text-fg-muted tabular">
          {kit.label} → your app · {commits} of {AREAS.length} commits
        </span>
      </figcaption>
    </figure>
  );
}
