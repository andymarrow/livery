"use client";

import { cn } from "@/lib/utils";

// Small form controls shared by the admin editors.

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (next: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-[13.5px] font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-[12.5px] text-fg-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200", checked ? "bg-accent" : "bg-surface-3")}
      >
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow-card transition-[left] duration-200 ease-out-soft", checked ? "left-[18px]" : "left-0.5")} />
      </button>
    </label>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-fg-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-fg-subtle">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-[13.5px] placeholder:text-fg-subtle transition-[border-color] hover:border-border-strong focus-visible:border-accent focus-visible:outline-none";

export function KindBadge({ kind }: { kind: "page" | "site" | "taste" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        kind === "taste" ? "bg-accent-soft text-accent-soft-fg" : kind === "site" ? "bg-surface-3 text-fg" : "bg-surface-2 text-fg-muted",
      )}
    >
      {kind === "site" ? "Multi-page" : kind === "taste" ? "Taste" : "Page"}
    </span>
  );
}
