import type { MotionSignature } from "@/lib/extract/process/motionStyle";
import type { Tokens } from "@/lib/extract/process/tokens";

// The site's signature motion, each kind played as a tiny demo with the
// measured duration and easing. Pure CSS; reduced motion stops all of it.

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const time = (ms: number) => (ms >= 1000 ? `${+(ms / 1000).toFixed(ms % 1000 ? 1 : 0)}s` : `${ms}ms`);
// Long cubic-bezier curves wrap badly; show them short.
const easeLabel = (e: string) => e.replace(/cubic-bezier\(([^)]+)\)/, (_, v: string) => `cubic(${v.split(",").map((n) => n.trim().replace(/^0\./, ".")).join(",")})`);

function Demo({ s }: { s: MotionSignature }) {
  const ease = s.easing || "ease";
  switch (s.kind) {
    case "typewriter":
      return (
        <span className="flex items-center font-mono text-[13px] text-fg">
          <span className="text-fg-subtle">$&nbsp;</span>
          <span className="inline-block overflow-hidden whitespace-nowrap" style={{ animation: `demo-type ${clamp(s.durationMs, 2400, 12000)}ms steps(11) infinite` }}>
            npm run dev
          </span>
          <span className="ml-px inline-block h-4 w-[7px] bg-accent" style={{ animation: "demo-blink 800ms steps(1) infinite" }} />
        </span>
      );
    case "line-draw":
      return (
        <svg viewBox="0 0 120 48" className="h-12 w-28 overflow-visible text-fg" fill="none" aria-hidden>
          {["M4 40 L34 12 L64 30 L116 6", "M4 44 L44 36 L80 42 L116 24"].map((d, i) => (
            <path key={d} d={d} pathLength={1} stroke="currentColor" strokeOpacity={i ? 0.35 : 0.85} strokeWidth={1.25} strokeDasharray={1} style={{ vectorEffect: "non-scaling-stroke", animation: `demo-draw ${clamp(s.durationMs * 3, 1800, 6000)}ms ${ease} ${i * (s.staggerMs ?? 120)}ms infinite both` }} />
          ))}
        </svg>
      );
    case "cycle": {
      const duration = clamp(s.durationMs, 3000, 12000);
      return (
        <span className="relative block h-6 w-32 overflow-hidden">
          {["Next.js 1.39s", "SvelteKit 802ms", "Farm 253ms"].map((label, i) => (
            <span key={label} className="absolute inset-0 flex items-center justify-center font-mono text-[12px] text-fg opacity-0" style={{ animation: `demo-cycle ${duration}ms ${ease} ${(i * duration) / 3}ms infinite` }}>
              {label}
            </span>
          ))}
        </span>
      );
    }
    case "marquee":
      return (
        <span className="block w-32 overflow-hidden">
          <span className="flex w-max gap-2" style={{ animation: `demo-rail ${clamp(s.durationMs / 4, 6000, 24000)}ms linear infinite` }}>
            {[0, 1].flatMap((copy) => [10, 16, 12, 20, 14, 18].map((w, i) => <span key={`${copy}-${i}`} className="h-3 rounded-full bg-fg/40" style={{ width: w * 2 }} />))}
          </span>
        </span>
      );
    case "clip-reveal":
      return (
        <span className="flex w-28 flex-col gap-1.5" style={{ animation: `demo-wipe ${clamp(s.durationMs, 2400, 10000)}ms steps(4, start) infinite` }}>
          {[90, 70, 80].map((w) => (
            <span key={w} className="h-1.5 rounded-full bg-fg/50" style={{ width: `${w}%` }} />
          ))}
        </span>
      );
    case "blink":
      return <span className="inline-block h-6 w-2.5 bg-accent" style={{ animation: `demo-blink ${clamp(s.durationMs, 400, 1600)}ms steps(1) infinite` }} />;
    case "pulse":
      return <span className="size-5 rounded-full bg-accent" style={{ animation: `demo-pulse ${clamp(s.durationMs, 800, 4000)}ms ${ease} infinite` }} />;
    case "spin":
      return <span className="size-7 rounded-full border-2 border-border-strong border-t-accent" style={{ animation: `demo-spin ${clamp(s.durationMs, 400, 3000)}ms linear infinite` }} />;
    case "shake":
      return <span className="block h-7 w-24 rounded-[8px] border border-border-strong bg-surface" style={{ animation: `demo-shake ${clamp(s.durationMs * 4, 1600, 4000)}ms ${ease} infinite` }} />;
    case "shimmer":
      return (
        <span className="relative block h-3 w-28 overflow-hidden rounded-full bg-surface-3">
          <span className="absolute inset-y-0 w-8 rounded-full bg-surface" style={{ animation: `demo-sweep ${clamp(s.durationMs, 1200, 4000)}ms linear infinite` }} />
        </span>
      );
    case "float":
      return <span className="size-6 rounded-[8px] bg-accent" style={{ animation: `demo-float ${clamp(s.durationMs, 1500, 6000)}ms ease-in-out infinite` }} />;
    default:
      return <span className="block h-7 w-20 rounded-[8px] border border-border-strong bg-surface" style={{ animation: `demo-enter ${clamp(s.durationMs * 4, 1600, 5000)}ms ${ease} infinite` }} />;
  }
}

export function MotionGlance({ motion }: { motion: Tokens["motion"] }) {
  const signatures = motion.signatures ?? [];
  if (!signatures.length) return null;
  return (
    <div>
      <p className="label-micro mb-3">Motion style · {signatures.length} signature {signatures.length === 1 ? "motion" : "motions"}{motion.interactions?.reducedMotion ? " · off under reduced motion" : ""}</p>
      <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {signatures.map((s) => (
          <li key={s.kind} className="overflow-hidden rounded-[14px] border border-border" title={s.description}>
            <div className="flex h-20 items-center justify-center bg-surface-2">
              <Demo s={s} />
            </div>
            <div className="border-t border-border bg-surface px-3 py-2.5">
              <p className="text-[12.5px] font-medium">{s.label}</p>
              <p className="mt-0.5 truncate font-mono text-[10.5px] text-fg-subtle">
                {time(s.durationMs)} · {easeLabel(s.easing)}
                {s.staggerMs ? ` · +${time(s.staggerMs)}` : s.loops ? " · loops" : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
