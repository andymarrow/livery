import { LicenceBadge } from "@/components/LicenceBadge";
import { Check, GitCommitHorizontal as GitCommit, RotateCw } from "@/components/icons";

// Reasons over values: a token, and the note that makes it a decision.
export function ReasonScene() {
  return (
    <div className="w-full max-w-[17.5rem]">
      <div className="flex items-center gap-3 rounded-[14px] border border-border bg-surface px-3.5 py-3">
        <span className="size-8 shrink-0 rounded-[10px] bg-accent transition-transform duration-300 ease-out-soft group-hover:scale-95" />
        <span className="min-w-0">
          <span className="block font-mono text-[12px] text-fg">--accent</span>
          <span className="block font-mono text-[11px] text-fg-subtle">#0d7268</span>
        </span>
      </div>
      <div className="ml-7 h-4 w-px bg-border-strong" />
      <div className="rounded-[14px] border border-dashed border-border-strong bg-bg px-3.5 py-2.5 text-[12px] leading-relaxed text-fg-muted transition-colors duration-300 group-hover:border-accent/60">
        <span className="font-medium text-fg">Why: </span>one accent per screen, on the action you want taken. Never on large surfaces.
      </div>
    </div>
  );
}

// Style, never assets: a logo goes in, a description comes out.
export function StyleScene() {
  return (
    <div className="flex w-full max-w-[18rem] items-center gap-3">
      <div className="flex size-20 shrink-0 items-center justify-center rounded-[16px] border border-border bg-surface">
        <span className="relative size-10">
          <span className="absolute inset-0 rounded-full border-[5px] border-fg" />
          <span className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-accent" />
        </span>
      </div>
      <span className="h-px flex-1 bg-border-strong" />
      <div className="w-36 shrink-0 rounded-[14px] border border-border bg-surface p-3">
        <LicenceBadge licence="style_only" compact />
        <p className="mt-2 text-[11.5px] leading-snug text-fg-muted">&ldquo;Geometric mark, one heavy ring, a single accent.&rdquo;</p>
        <div className="mt-2 h-5 rounded-md bg-surface-3" />
      </div>
    </div>
  );
}

// Your project, your rules: each area is its own commit, each one undoable.
export function RulesScene() {
  const commits = [
    ["9f2c1ab", "tokens"],
    ["4e8d0f2", "components"],
    ["b71e3c9", "motion"],
  ];
  return (
    <div className="w-full max-w-[18rem] rounded-[14px] border border-border bg-surface p-3.5 font-mono text-[11.5px] leading-[1.9]">
      {commits.map(([hash, area], index) => (
        <p key={hash} className={index === 2 ? "flex items-center gap-2 truncate transition-opacity duration-300 group-hover:opacity-40" : "flex items-center gap-2 truncate"}>
          <GitCommit strokeWidth={2.25} className="size-3.5 shrink-0 text-accent-ink" />
          <span className="text-fg-subtle">{hash}</span>
          <span className="truncate text-fg">{area}</span>
        </p>
      ))}
      <p className="mt-1 flex items-center gap-2 border-t border-dashed border-border pt-1.5 text-fg-muted">
        <RotateCw strokeWidth={2.25} className="size-3.5 shrink-0" />
        git revert b71e3c9
      </p>
    </div>
  );
}

// Owners decide: one small file, read before anything else.
export function OwnerScene() {
  return (
    <div className="w-full max-w-[17.5rem] overflow-hidden rounded-[14px] border border-border bg-surface">
      <p className="border-b border-border px-3.5 py-2 font-mono text-[11px] text-fg-subtle">/.well-known/livery.json</p>
      <pre className="px-3.5 py-2.5 font-mono text-[11.5px] leading-[1.8] text-fg-muted">
        <span className="text-fg">&quot;allow&quot;</span>
        {": { "}
        <span className="text-fg">&quot;levels&quot;</span>
        {": [1, 2, 3, "}
        <span className="rounded bg-accent-soft px-1 text-accent-soft-fg">4</span>
        {"] }"}
      </pre>
      <p className="flex items-center gap-1.5 border-t border-border px-3.5 py-2 text-[11.5px] text-fg-muted">
        <Check className="size-3.5 text-accent-ink" strokeWidth={2.25} />
        Read before every visit
      </p>
    </div>
  );
}
