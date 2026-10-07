import { Badge, LiveDot } from "@/components/ui/badge";
import { HeroFigure } from "./HeroFigure";
import { KitInput } from "./KitInput";

const AGENTS = ["Claude Code", "Codex", "Cursor", "Windsurf"];

export function Hero({ kitCount }: { kitCount: number }) {
  return (
    <section className="relative overflow-hidden border-b border-border px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
      {/* Hairline grid, drawn with lines rather than shading; fades nowhere, just stops at the edges. */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full text-border" preserveAspectRatio="none">
        <defs>
          <pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-14">
        <div className="min-w-0">
          <Badge variant="neutral" className="animate-rise h-7 bg-surface px-3 text-xs shadow-card">
            <LiveDot />
            {kitCount >= 25 ? `${kitCount.toLocaleString("en-US")} design kits in the library` : "Design kits for coding agents"}
          </Badge>

          <h1 className="animate-rise mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl" style={{ animationDelay: "60ms" }}>
            Give Your App a New{" "}
            <span className="relative inline-block whitespace-nowrap text-accent-ink">
              Livery
              {/* A single hand-drawn stroke, drawn in once on load. */}
              <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-1.5 left-0 h-2.5 w-full overflow-visible">
                <path d="M2 8.5 C 48 3.5, 110 2.5, 198 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" pathLength={1} className="hero-stroke" />
              </svg>
            </span>
          </h1>

          <p className="animate-rise mt-5 max-w-lg text-base leading-relaxed text-fg-muted text-pretty" style={{ animationDelay: "120ms" }}>
            Paste any website. Your agent gets its design as a kit, asks before changing anything, then commits one area at a time.
          </p>

          <div className="animate-rise mt-8 w-full" style={{ animationDelay: "180ms" }}>
            <KitInput />
          </div>

          <p className="animate-rise mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-subtle" style={{ animationDelay: "240ms" }}>
            Works with
            {AGENTS.map((agent) => (
              <span key={agent} className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-fg-muted">
                {agent}
              </span>
            ))}
            <span className="text-xs">and more</span>
          </p>
        </div>

        <div className="animate-rise min-w-0" style={{ animationDelay: "160ms" }}>
          <HeroFigure />
        </div>
      </div>
    </section>
  );
}
