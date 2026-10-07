"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

// A destructive button that asks once, in place: first press arms it, the
// second (within four seconds) runs the action.
export function ConfirmAction({ label, confirm, run, tone = "danger" }: { label: string; confirm: string; run: () => Promise<void>; tone?: "danger" | "neutral" }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          setFailed(false);
          setTimeout(() => setArmed(false), 4000);
          return;
        }
        setArmed(false);
        start(async () => {
          try {
            await run();
          } catch {
            setFailed(true);
          }
        });
      }}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-medium transition-colors duration-150 disabled:opacity-50",
        armed
          ? tone === "danger"
            ? "border-danger bg-danger text-white"
            : "border-fg bg-fg text-bg"
          : failed
            ? "border-danger text-danger"
            : "border-border text-fg-muted hover:border-border-strong hover:text-fg",
      )}
    >
      {pending ? "Working…" : failed ? "Failed, retry" : armed ? confirm : label}
    </button>
  );
}
