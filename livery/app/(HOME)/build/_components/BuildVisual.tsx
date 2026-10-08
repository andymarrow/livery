import type { BuildStage } from "@/lib/extract/types";
import { Check } from "@/components/icons";
import { cn } from "@/lib/utils";

// What the current build stage is doing, drawn: the address checked, three
// screens rendered, the page measured, rules written, files packed, the link
// published. Shapes stand in for values (nothing here invents a reading).
// Pure CSS animation; reduced motion shows each stage at rest.

const STAGES: BuildStage[] = ["checking", "rendering", "extracting", "writing", "packaging", "publishing"];

function Panel({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div aria-hidden={!show} className={cn("absolute inset-0 flex items-center justify-center p-6 transition-[opacity,transform] duration-500 ease-out-soft", show ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0")}>
      {children}
    </div>
  );
}

// A page drawn with its content removed: header, heading, text, cards.
function Wire({ cols = 3, className, scan = false }: { cols?: number; className?: string; scan?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[10px] border border-border-strong bg-surface p-2.5", className)}>
      <div className="flex items-center justify-between">
        <span className="h-1.5 w-8 rounded-full bg-fg/60" />
        <span className="flex gap-1">
          {Array.from({ length: Math.min(cols, 3) }, (_, i) => <span key={i} className="h-1 w-3 rounded-full bg-fg/25" />)}
        </span>
      </div>
      <span className="mt-3 block h-2.5 w-2/3 rounded-full bg-fg/70" />
      <span className="mt-1.5 block h-1.5 w-1/2 rounded-full bg-fg/25" />
      <span className="mt-1 block h-1.5 w-2/5 rounded-full bg-fg/25" />
      <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }, (_, i) => (
          <span key={i} className="build-fill h-8 rounded-[6px] bg-surface-3" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </div>
      {scan && <span className="build-scan absolute inset-x-0 top-0 h-px bg-accent" />}
    </div>
  );
}

export function BuildVisual({ stage, host, waiting }: { stage: BuildStage | null; host: string; waiting: boolean }) {
  const current = waiting ? "rendering" : (stage ?? "checking");
  const index = STAGES.indexOf(current);
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-[18px] border border-border bg-surface-2 shadow-card sm:h-72">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-border">
        <div className="h-full bg-accent transition-[width] duration-700 ease-out-soft" style={{ width: `${Math.max(6, ((index + 0.6) / STAGES.length) * 100)}%` }} />
      </div>

      <Panel show={current === "checking"}>
        <div className="w-full max-w-sm">
          <div className="flex h-11 items-center gap-2 rounded-[12px] border border-border-strong bg-surface px-3.5 font-mono text-[13px]">
            <span className="text-fg-subtle">https://</span>
            <span className="truncate text-fg">{host}</span>
            <span className="build-caret ml-px h-4 w-[2px] rounded-full bg-accent" />
          </div>
          <ul className="mt-3 space-y-1.5 pl-1 font-mono text-[12px]">
            {["safe address", "robots.txt", "livery.json"].map((line, i) => (
              <li key={line} className="build-pop flex items-center gap-2 text-fg-muted" style={{ animationDelay: `${300 + i * 450}ms` }}>
                <Check className="size-3.5 text-accent-ink" strokeWidth={2.25} /> {line}
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel show={current === "rendering"}>
        <div className="flex w-full max-w-md items-end justify-center gap-3">
          {[
            { w: "w-52", cols: 3, label: "1440" },
            { w: "w-28", cols: 2, label: "820" },
            { w: "w-16", cols: 1, label: "390" },
          ].map((s, i) => (
            <div key={s.label} className={cn("build-pop", s.w)} style={{ animationDelay: `${i * 260}ms` }}>
              <Wire cols={s.cols} />
              <p className="mt-1.5 text-center font-mono text-[10.5px] text-fg-subtle">{s.label}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel show={current === "extracting"}>
        <div className="grid w-full max-w-md grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-4">
          <Wire cols={3} scan />
          <ul className="space-y-2.5 text-[11.5px] text-fg-muted">
            <li className="build-pop" style={{ animationDelay: "200ms" }}>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Colour</span>
              <span className="mt-1 flex gap-1">
                {["bg-fg", "bg-surface", "bg-accent", "bg-fg/40", "bg-surface-3"].map((c, i) => (
                  <span key={c} className={cn("build-pop size-4 rounded-[4px] border border-border", c)} style={{ animationDelay: `${300 + i * 120}ms` }} />
                ))}
              </span>
            </li>
            <li className="build-pop flex items-baseline gap-2" style={{ animationDelay: "900ms" }}>
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Type</span>
              <span className="text-lg font-semibold text-fg">Aa</span>
              <span className="text-[12px]">Aa</span>
            </li>
            <li className="build-pop" style={{ animationDelay: "1300ms" }}>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Spacing</span>
              <span className="mt-1 flex items-end gap-1">
                {[4, 8, 12, 16, 24].map((h) => <span key={h} className="w-1.5 rounded-sm bg-accent/70" style={{ height: h }} />)}
              </span>
            </li>
            <li className="build-pop flex items-center gap-2" style={{ animationDelay: "1700ms" }}>
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Corners</span>
              <span className="size-4 rounded-[3px] border border-fg/50" />
              <span className="size-4 rounded-[7px] border border-fg/50" />
              <span className="h-4 w-7 rounded-full border border-fg/50" />
            </li>
          </ul>
        </div>
      </Panel>

      <Panel show={current === "writing"}>
        <div className="w-full max-w-sm rounded-[12px] border border-border-strong bg-surface p-4">
          <p className="font-mono text-[11px] text-fg-subtle">rules.md</p>
          {[["Principles", [92, 78, 84]], ["Never", [70, 88]]].map(([title, lines], block) => (
            <div key={String(title)} className="mt-3">
              <p className="build-pop text-[12px] font-semibold" style={{ animationDelay: `${block * 1400}ms` }}>{String(title)}</p>
              {(lines as number[]).map((w, i) => (
                <span key={i} className="build-write mt-1.5 block h-1.5 rounded-full bg-fg/30" style={{ ["--w" as string]: `${w}%`, animationDelay: `${block * 1400 + 250 + i * 380}ms` }} />
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <Panel show={current === "packaging"}>
        <div className="flex w-full max-w-sm flex-col items-center">
          <div className="flex flex-col-reverse items-center">
            {["frames/", "motion.md", "components.md", "tokens.json", "SKILL.md"].map((file, i) => (
              <span key={file} className="build-drop -mt-1 flex h-8 w-52 items-center rounded-[8px] border border-border-strong bg-surface px-3 font-mono text-[11.5px] text-fg-muted first:mt-0" style={{ animationDelay: `${i * 260}ms` }}>
                {file}
              </span>
            ))}
          </div>
          <p className="build-pop mt-4 font-mono text-[11px] text-fg-subtle" style={{ animationDelay: "1500ms" }}>
            sha256 <span className="build-hash text-fg-muted">verifying</span>
          </p>
        </div>
      </Panel>

      <Panel show={current === "publishing"}>
        <div className="build-pop flex items-center gap-3 rounded-[14px] border border-accent bg-surface px-4 py-3 font-mono text-[13px]">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent text-on-accent">
            <Check className="size-3.5" strokeWidth={2.5} />
          </span>
          <span className="truncate">
            livery.site/k/<span className="text-fg">{host.replace(/\./g, "-")}</span>
          </span>
        </div>
      </Panel>
    </div>
  );
}
