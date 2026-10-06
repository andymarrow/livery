import { Badge, LiveDot } from "@/components/ui/badge";
import { KitInput } from "./KitInput";

const AGENTS = ["Claude Code", "Codex", "Cursor", "Windsurf", "any agent that reads Markdown"];

export function Hero({ kitCount }: { kitCount: number }) {
  return (
    <section className="relative px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Badge variant="neutral" className="animate-rise h-7 px-3 text-[12.5px]">
          <LiveDot />
          {/* The count only appears once the library is big enough to say something. */}
          {kitCount >= 25 ? `${kitCount.toLocaleString("en-US")} design kits in the library` : "Design kits for coding agents"}
        </Badge>

        <h1
          className="mt-7 text-[44px] font-semibold leading-[0.98] tracking-[-0.045em] text-balance sm:text-6xl md:text-[78px]"
        >
          Give your app a new{" "}
          <span className="relative inline-block whitespace-nowrap">
            <span aria-hidden className="absolute inset-x-[-0.08em] bottom-[0.08em] top-[0.18em] -skew-x-12 rounded-[0.12em] bg-accent-soft" />
            <span className="relative text-accent-soft-fg">livery</span>
          </span>
          .
        </h1>

        <p
          className="mt-6 max-w-xl text-[17px] leading-relaxed text-fg-muted text-pretty sm:text-lg"
        >
          Paste any website. Get a design kit your coding agent installs in one step. It audits your project, asks
          before it changes anything, and applies the look one commit at a time.
        </p>

        <div className="animate-rise mt-10 w-full" style={{ animationDelay: "180ms" }}>
          <KitInput />
        </div>

        <p className="animate-rise mt-12 text-[13px] text-fg-subtle" style={{ animationDelay: "240ms" }}>
          Works with{" "}
          {AGENTS.map((agent, index) => (
            <span key={agent}>
              <span className="text-fg-muted">{agent}</span>
              {index < AGENTS.length - 2 ? ", " : index === AGENTS.length - 2 ? " and " : ""}
            </span>
          ))}
          .
        </p>
      </div>
    </section>
  );
}
