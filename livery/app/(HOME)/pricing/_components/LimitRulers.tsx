import type { Limits } from "@/lib/billing/plans";

// Where the free plan ends, drawn as measurements: each limit is a ruler as
// long as Pro's, with Free's share filled in. Livery measures designs; its
// pricing is measured too.

const ROWS: { key: "buildsPerHour" | "tasteSites" | "capturesPerHour"; label: string; unit: string }[] = [
  { key: "buildsPerHour", label: "New kits", unit: "an hour" },
  { key: "tasteSites", label: "Sites in a taste or multi-page kit", unit: "sites" },
  { key: "capturesPerHour", label: "Extension pages", unit: "an hour" },
];

export function LimitRulers({ limits }: { limits: Limits }) {
  return (
    <section aria-labelledby="limits" className="rounded-[20px] border border-border bg-surface p-6 shadow-card sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="label-micro">Measured</p>
          <h2 id="limits" className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Where the Free Plan Ends</h2>
        </div>
        <p className="flex items-center gap-4 text-[12.5px] text-fg-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-accent" aria-hidden /> Free</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-accent-soft ring-1 ring-inset ring-accent/30" aria-hidden /> Pro</span>
        </p>
      </div>
      <dl className="mt-8 space-y-8">
        {ROWS.map((row, i) => {
          const free = limits.free[row.key];
          const pro = Math.max(limits.pro[row.key], free, 1);
          const share = Math.min(1, free / pro);
          const labelAt = Math.min(Math.max(share * 100, 4), 78);
          return (
            <div key={row.key}>
              <dt className="flex items-baseline justify-between gap-4 text-[14px]">
                <span className="font-medium">{row.label}</span>
                <span className="shrink-0 font-mono text-[12px] text-fg-muted">
                  {free} → <span className="font-semibold text-accent-ink">{pro}</span> {row.unit}
                </span>
              </dt>
              <dd className="mt-3">
                <div className="relative h-2.5 overflow-hidden rounded-full bg-accent-soft ring-1 ring-inset ring-accent/25">
                  <div className="pr-grow absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${share * 100}%`, "--d": `${i * 120}ms` } as React.CSSProperties} />
                </div>
                <div className="relative mt-1.5 h-4" aria-hidden>
                  {Array.from({ length: 21 }, (_, t) => (
                    <span key={t} className="absolute top-0 w-px bg-border-strong" style={{ left: `${t * 5}%`, height: t % 5 === 0 ? 6 : 3 }} />
                  ))}
                  <span className="absolute top-0 h-2.5 w-px bg-accent" style={{ left: `${share * 100}%` }} />
                </div>
                <div className="relative h-4 font-mono text-[11px] text-fg-subtle" aria-hidden>
                  <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${labelAt}%` }}>Free {free}</span>
                  <span className="absolute right-0 whitespace-nowrap text-accent-ink">Pro {pro}</span>
                </div>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
