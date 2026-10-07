import { GitCommitHorizontal as GitCommit, BadgeCheck as SealCheck } from "@/components/icons";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { cn } from "@/lib/utils";
import { ConflictChoice } from "./ConflictChoice";

const STEPS = ["Prepare", "Audit", "Scan rules", "Report gap", "Ask", "Resolve conflicts", "Licences", "Apply", "Verify", "Keep it", "Summary"];

const GAP = [
  { area: "Tokens", size: "Large", level: 3 },
  { area: "Components", size: "Medium", level: 2 },
  { area: "Layout", size: "Small", level: 1 },
  { area: "Motion", size: "Medium", level: 2 },
  { area: "Voice", size: "Small", level: 1 },
];

// A coding agent, drawn as what it is: a prompt waiting for input.
function AgentMark() {
  return (
    <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center gap-[2px] rounded-[10px] bg-fg font-mono text-[17px] font-bold leading-none text-bg">
      <span className="-translate-y-[1.5px]">›</span>
      <span className="h-[2.5px] w-2 translate-y-[6px] rounded-full bg-accent animate-caret" />
    </span>
  );
}

function YouMark() {
  return (
    <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft font-mono text-[10.5px] font-semibold tracking-tight text-accent-soft-fg">
      you
    </span>
  );
}

function Message({ from, children, delay = 0 }: { from: "agent" | "you"; children: React.ReactNode; delay?: number }) {
  const agent = from === "agent";
  return (
    <Reveal delay={delay} as="li" className={cn("flex gap-3", !agent && "flex-row-reverse")}>
      {agent ? <AgentMark /> : <YouMark />}
      <div className={cn("min-w-0 max-w-[34rem]", agent ? "flex-1" : "text-right")}>
        <p className="mb-1.5 text-[11.5px] font-medium text-fg-subtle">{agent ? "Your agent" : "You"}</p>
        <div className={cn("text-left text-sm leading-relaxed", agent ? "block" : "inline-block rounded-[18px] rounded-tr-md bg-fg px-4 py-2.5 text-bg")}>
          {children}
        </div>
      </div>
    </Reveal>
  );
}

export function TheFlow() {
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            kicker="The flow"
            title="Your agent asks before it touches anything."
            description="Every kit carries the same eleven steps. Nothing is edited until you've seen the gap, chosen the areas and settled any conflict with your own project rules."
          />
          <ol className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-2">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-baseline gap-2 text-[13px]">
                <span className="w-5 shrink-0 font-mono text-[11px] text-fg-subtle tabular">{String(index).padStart(2, "0")}</span>
                <span className={cn(index === 4 || index === 7 ? "font-medium text-fg" : "text-fg-muted")}>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <ol className="flex min-w-0 flex-col gap-7 rounded-[18px] border border-border bg-surface p-5 sm:p-8 shadow-card">
          <Message from="agent">
            <p className="text-fg-muted">
              Audited your project. <span className="text-fg">Tailwind v4</span>, tokens in{" "}
              <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] text-fg">app/globals.css</code>, and{" "}
              <span className="text-fg">41 hard-coded colours</span> across 12 files. I can centralise those first.
            </p>
          </Message>

          <Message from="agent" delay={60}>
            <p className="mb-3 text-fg-muted">Here is how far your design is from this kit:</p>
            <div className="overflow-hidden rounded-[14px] border border-border">
              {GAP.map((row) => (
                <div key={row.area} className="flex items-center justify-between gap-6 border-b border-border px-3.5 py-2 last:border-b-0">
                  <span className="text-[13.5px] text-fg">{row.area}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="flex gap-0.5" aria-hidden>
                      {[1, 2, 3].map((n) => (
                        <span key={n} className={cn("h-3 w-1.5 rounded-full", n <= row.level ? "bg-accent" : "bg-surface-3")} />
                      ))}
                    </span>
                    <span className="w-14 text-right text-[12.5px] text-fg-subtle">{row.size}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-fg-muted">Which areas should I apply, and is there anything that must not change?</p>
          </Message>

          <Message from="you">Tokens and components. Keep our logo colour.</Message>

          <Message from="agent">
            <p className="mb-3 text-fg-muted">One conflict with your project rules:</p>
            <div className="rounded-[14px] border border-border bg-bg p-3.5">
              <p className="font-mono text-[11.5px] text-fg-subtle">CLAUDE.md:14</p>
              <p className="mt-1 text-[13.5px] text-fg">“Primary buttons are blue (#2563eb).”</p>
            </div>
            <ConflictChoice />
          </Message>

          <Message from="agent">
            <div className="rounded-[14px] border border-border bg-bg p-3.5 font-mono text-[12px] leading-[1.9]">
              {[
                ["9f2c1ab", "tokens"],
                ["4e8d0f2", "components"],
              ].map(([hash, area]) => (
                <p key={hash} className="flex items-center gap-2 truncate">
                  <GitCommit strokeWidth={2.25} className="size-3.5 shrink-0 text-accent-ink" />
                  <span className="text-fg-subtle">{hash}</span>
                  <span className="truncate text-fg">livery(example.com v1): {area}</span>
                </p>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-2 text-fg-muted">
              <SealCheck className="size-4 shrink-0 text-accent-ink" />
              Contrast checked in both themes. To undo one area: git revert &lt;hash&gt;.
            </p>
          </Message>
        </ol>
      </div>
    </section>
  );
}
