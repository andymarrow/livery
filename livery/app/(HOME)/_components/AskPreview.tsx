"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const AREAS = [
  { name: "Colours", gap: "Large change" },
  { name: "Typography", gap: "Small change" },
  { name: "Motion", gap: "Medium change" },
];

// A miniature of the question step. The toggles are real, so people can feel
// that nothing is applied without their say.
export function AskPreview() {
  const [approved, setApproved] = useState<Record<string, boolean>>({ Colours: true, Typography: true, Motion: false });

  return (
    <ul className="w-full max-w-[17rem] divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {AREAS.map((area) => {
        const on = approved[area.name];
        return (
          <li key={area.name}>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => setApproved((all) => ({ ...all, [area.name]: !all[area.name] }))}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2"
            >
              <span>
                <span className="block text-[13px] font-medium text-fg">{area.name}</span>
                <span className="block text-[11.5px] text-fg-subtle">{area.gap}</span>
              </span>
              <span
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold transition-colors duration-200",
                  on ? "bg-accent text-on-accent" : "bg-surface-3 text-fg-muted",
                )}
              >
                {on && <Check className="size-3" strokeWidth={2.25} />}
                {on ? "Apply" : "Skip"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
