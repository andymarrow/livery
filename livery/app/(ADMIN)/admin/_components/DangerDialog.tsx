"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { inputClass } from "./Controls";

// Confirms something that can't be undone. Big jobs ask for a typed word.
export function DangerDialog({
  open,
  title,
  description,
  items = [],
  confirmLabel,
  typeToConfirm,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  items?: string[];
  confirmLabel: string;
  typeToConfirm?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const ready = !typeToConfirm || typed.trim().toLowerCase() === typeToConfirm;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !pending) {
          setTyped("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
        <DialogDescription asChild>
          <div className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{description}</div>
        </DialogDescription>
        {items.length > 0 && (
          <ul className="mt-4 max-h-44 overflow-y-auto rounded-[10px] border border-border bg-surface-2/50 px-3 py-2 font-mono text-[12px] text-fg-muted">
            {items.slice(0, 50).map((item) => (
              <li key={item} className="truncate py-0.5">{item}</li>
            ))}
            {items.length > 50 && <li className="py-0.5">and {items.length - 50} more</li>}
          </ul>
        )}
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ready) return;
            start(async () => {
              await onConfirm();
              setTyped("");
            });
          }}
        >
          {typeToConfirm && (
            <label className="block text-[12.5px] text-fg-muted">
              Type <span className="font-mono text-fg">{typeToConfirm}</span> to confirm
              <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={`${inputClass} mt-1.5`} />
            </label>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={!ready || pending} className="bg-danger text-bg hover:bg-danger hover:opacity-90">
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
