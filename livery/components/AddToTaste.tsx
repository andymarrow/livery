"use client";

import { Check, Plus } from "@/components/icons";
import { TASTE_MAX, useTasteTray } from "@/lib/kit/tasteTray";
import { cn } from "@/lib/utils";

// Collects a page kit into the visitor's taste. The header counter picks it up.
export function AddToTaste({ url, label = "Taste", className }: { url: string; label?: string; className?: string }) {
  const { has, toggle, full } = useTasteTray();
  const added = has(url);
  const disabled = !added && full;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(url);
      }}
      disabled={disabled}
      aria-pressed={added}
      title={disabled ? `A taste holds up to ${TASTE_MAX} sites` : added ? "Remove from your taste" : "Add to your taste"}
      className={cn(
        "relative z-10 inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11.5px] font-medium transition-[background-color,border-color,color] duration-200 disabled:cursor-not-allowed disabled:opacity-45",
        added ? "border-accent bg-accent text-on-accent" : "border-border bg-surface text-fg-muted hover:border-accent hover:text-fg",
        className,
      )}
    >
      <span className="relative size-3">
        <Plus strokeWidth={2.5} className={cn("absolute inset-0 size-3 transition-[transform,opacity] duration-200", added ? "rotate-90 scale-50 opacity-0" : "opacity-100")} />
        <Check strokeWidth={2.75} className={cn("absolute inset-0 size-3 transition-[transform,opacity] duration-200", added ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
      </span>
      {label}
    </button>
  );
}
