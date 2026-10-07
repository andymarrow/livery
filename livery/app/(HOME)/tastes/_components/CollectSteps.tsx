"use client";

import Link from "next/link";
import { useTasteTray } from "@/lib/kit/tasteTray";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Collect", body: "Tap + Taste on any kit in the library, or paste the links yourself. Up to five sites." },
  { title: "Name it", body: "Say whose eye it is. Named tastes are listed under that person, so others can browse them." },
  { title: "Apply it", body: "The kit holds what every site shares as rules, and the measured range where they differ." },
];

// Three steps, with the first one live: it shows what the visitor has collected so far.
export function CollectSteps() {
  const { links } = useTasteTray();
  return (
    <ol className="grid grid-cols-1 overflow-hidden rounded-[18px] border border-border bg-surface shadow-card md:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className={cn("flex flex-col gap-3 p-6 sm:p-7", index > 0 && "border-t border-border md:border-l md:border-t-0")}>
          <span className="font-mono text-[11px] text-accent-ink">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-lg font-semibold tracking-tight">{step.title}</span>
          <span className="text-sm leading-relaxed text-fg-muted">{step.body}</span>
          {index === 0 && (
            <span className="mt-auto flex items-center gap-2 pt-3 text-[12.5px] text-fg-subtle">
              <span className="flex gap-0.5" aria-hidden>
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={cn("size-2 rounded-full transition-colors duration-300", i < links.length ? "bg-accent" : "bg-border-strong")} />
                ))}
              </span>
              {links.length ? (
                <Link href="/combine?kind=taste" className="font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent">
                  {links.length} collected · build it
                </Link>
              ) : (
                "Nothing collected yet"
              )}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
