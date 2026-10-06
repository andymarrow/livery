"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "neutral" | "success" | "danger";
type Toast = { id: number; title: string; description?: string; tone: ToastTone };
type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: ToastTone };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const ICONS = { neutral: Info, success: CircleCheck, danger: CircleAlert } as const;
const ICON_COLOURS = { neutral: "text-fg-muted", success: "text-success", danger: "text-danger" } as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback(
    ({ tone = "neutral", ...toast }: ToastInput) => {
      const id = ++nextId.current;
      setToasts((all) => [...all.slice(-2), { id, tone, ...toast }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <li
              key={toast.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-[toast-in_240ms_var(--ease-out-soft)] items-start gap-3 rounded-xl border border-border-strong bg-surface p-3.5"
            >
              <Icon className={cn("mt-px size-4 shrink-0", ICON_COLOURS[toast.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-m-1 inline-flex size-6 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-2 hover:text-fg"
              >
                <X className="size-3.5" />
                <span className="sr-only">Dismiss</span>
              </button>
            </li>
          );
        })}
      </ol>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast must be used inside ToastProvider");
  return push;
}
