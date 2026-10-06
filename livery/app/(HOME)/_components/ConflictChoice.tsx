"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = ["Keep the rule", "Override once", "Override and update the rule"];

// The three answers every conflict gets. Real buttons, so the choice feels yours.
export function ConflictChoice() {
  const [choice, setChoice] = useState(2);
  return (
    <div role="radiogroup" aria-label="How to resolve the conflict" className="mt-3 flex flex-wrap gap-1.5">
      {OPTIONS.map((option, index) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={choice === index}
          onClick={() => setChoice(index)}
          className={cn(
            "h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors duration-150",
            choice === index ? "border-accent bg-accent-soft text-accent-soft-fg" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
