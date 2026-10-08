import type { BuildStage } from "@/lib/extract/types";
import { BuildScene } from "./BuildScenes";

// The build, drawn as a measuring instrument around an isometric scene: a
// grid, rulers that track the work, a readout of the real stage and the
// server's live detail, and one hairline scene per stage (BuildScenes). The
// scene remounts when the stage changes, so its lines draw in fresh.
// Reduced motion shows each scene at rest.

const STAGES: { id: BuildStage; name: string }[] = [
  { id: "checking", name: "Checking" },
  { id: "rendering", name: "Rendering" },
  { id: "extracting", name: "Measuring" },
  { id: "writing", name: "Writing" },
  { id: "packaging", name: "Packaging" },
  { id: "publishing", name: "Publishing" },
];

export function BuildVisual({ stage, host, detail, waiting }: { stage: BuildStage | null; host: string; detail?: string; waiting: boolean }) {
  const current = waiting ? "rendering" : (stage ?? "checking");
  const index = Math.max(0, STAGES.findIndex((s) => s.id === current));
  const ticks = Array.from({ length: 61 }, (_, i) => i);
  return (
    <div className="relative h-[19rem] w-full overflow-hidden rounded-[18px] border border-border bg-surface-2 shadow-card sm:h-80">
      {/* Measuring grid and rulers */}
      <svg className="absolute inset-0 h-full w-full text-border" aria-hidden>
        <defs>
          <pattern id="bv-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bv-grid)" />
      </svg>
      <svg className="absolute inset-x-0 top-0 h-3 w-full text-border-strong" preserveAspectRatio="none" viewBox="0 0 600 12" aria-hidden>
        {ticks.map((i) => <line key={i} x1={i * 10} x2={i * 10} y1={0} y2={i % 5 === 0 ? 8 : 4} stroke="currentColor" strokeWidth={1} style={{ vectorEffect: "non-scaling-stroke" }} />)}
      </svg>
      <span className="bv-ruler-x absolute top-0 h-3 w-px bg-accent" aria-hidden />
      <svg className="absolute inset-y-0 left-0 h-full w-3 text-border-strong" preserveAspectRatio="none" viewBox="0 0 12 400" aria-hidden>
        {ticks.map((i) => <line key={i} y1={i * 10} y2={i * 10} x1={0} x2={i % 5 === 0 ? 8 : 4} stroke="currentColor" strokeWidth={1} style={{ vectorEffect: "non-scaling-stroke" }} />)}
      </svg>
      <span className="bv-ruler-y absolute left-0 h-px w-3 bg-accent" aria-hidden />

      {/* Readout */}
      <div className="absolute inset-x-5 top-4 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-wider text-fg-subtle">
        <span>
          <span className="text-accent-ink">{String(index + 1).padStart(2, "0")}</span> / 06 · <span key={current} className="bv-type inline-block overflow-hidden whitespace-nowrap align-bottom text-fg">{STAGES[index].name}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bv-rec size-1.5 rounded-full bg-accent" /> live
        </span>
      </div>
      <div className="absolute inset-x-5 bottom-3 flex items-center gap-2 font-mono text-[10.5px] text-fg-subtle">
        <span className="h-px flex-1 bg-border" />
        <span key={detail ?? current} className="bv-fade max-w-[70%] truncate">{detail ?? (waiting ? "someone else is building this kit" : host)}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-border">
        <div className="h-full bg-accent transition-[width] duration-700 ease-out-soft" style={{ width: `${Math.max(5, ((index + 0.6) / STAGES.length) * 100)}%` }} />
      </div>

      <div key={current} className="bv-enter absolute inset-x-6 bottom-9 top-9 flex items-center justify-center">
        <div className="w-full max-w-xl">
          <BuildScene stage={current} host={host} />
        </div>
      </div>
    </div>
  );
}
