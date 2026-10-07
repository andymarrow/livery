import Link from "next/link";
import { HeroFigure } from "./HeroFigure";
import { KitInput } from "./KitInput";
import { MeasureField } from "./MeasureField";

const AGENTS = ["Claude Code", "Codex", "Cursor", "Windsurf"];

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden border-b border-border px-4 py-14 sm:px-6 lg:py-20">
      <MeasureField />

      <div className="relative mx-auto grid w-full max-w-[80rem] grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16">
        <div className="min-w-0">
          <h1
            className="animate-rise text-[44px] font-bold leading-[1.02] tracking-[-0.035em] text-balance sm:text-6xl xl:text-[76px]"
            style={{ animationDelay: "60ms" }}
          >
            Give Your App
            <br />a New{" "}
            <span className="relative inline-block whitespace-nowrap text-accent-ink">
              Livery
              <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full overflow-visible">
                <path d="M2 8.5 C 48 3.5, 110 2.5, 198 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" pathLength={1} className="hero-stroke" />
              </svg>
            </span>
          </h1>

          <p className="animate-rise mt-7 max-w-xl text-lg leading-relaxed text-fg-muted text-pretty" style={{ animationDelay: "120ms" }}>
            Paste any website. Your coding agent gets its design as a kit, asks before changing anything, then rebuilds your
            look one commit at a time.
          </p>

          <div className="animate-rise mt-9 w-full max-w-2xl" style={{ animationDelay: "180ms" }}>
            <KitInput />
          </div>

          <p className="animate-rise mt-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-fg-muted" style={{ animationDelay: "210ms" }}>
            More than one link?
            <Link href="/combine" className="group inline-flex items-center gap-1 font-medium text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent">
              Combine pages of a site
            </Link>
            <span aria-hidden className="text-fg-subtle">or</span>
            <Link href="/combine?kind=taste" className="group inline-flex items-center gap-1 font-medium text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent">
              capture someone&apos;s taste
            </Link>
          </p>

          <p className="animate-rise mt-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-fg-subtle" style={{ animationDelay: "240ms" }}>
            Works with
            {AGENTS.map((agent) => (
              <span key={agent} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg">
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
