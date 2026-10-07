import { Check, LockKeyhole } from "@/components/icons";
import { cn } from "@/lib/utils";

// The popup, in miniature: choose where the page goes.
export function ChooseScene() {
  return (
    <div className="w-full max-w-[15.5rem] overflow-hidden rounded-[14px] border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-tight">
          <span className="size-3.5 rounded-[4px] bg-fg" /> livery
        </span>
        <span className="text-[10.5px] text-fg-subtle">app.example.com</span>
      </div>
      <div className="space-y-1.5 p-2.5">
        {[
          ["example.com", "Your kit · next version v4", true],
          ["A new private kit", "Just this page, to start", false],
        ].map(([title, detail, on]) => (
          <div key={String(title)} className={cn("flex items-start gap-2 rounded-[10px] border px-2.5 py-1.5", on ? "border-accent" : "border-border")}>
            <span className={cn("mt-1 flex size-3 shrink-0 items-center justify-center rounded-full border", on ? "border-accent" : "border-border-strong")}>
              {on && <span className="size-1.5 rounded-full bg-accent" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11.5px] font-semibold">{title}</span>
              <span className="block truncate text-[10px] text-fg-subtle">{detail}</span>
            </span>
          </div>
        ))}
        <span className="mt-1 flex h-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-on-accent">Measure this page</span>
      </div>
    </div>
  );
}

// The page's words stay; only their shape travels.
export function TextStaysScene() {
  return (
    <div className="grid w-full max-w-[18rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
      <div className="rounded-[12px] border border-border bg-surface p-2.5">
        <p className="text-[11.5px] font-semibold leading-tight">Hi, Jordan</p>
        <p className="mt-1 text-[10px] leading-snug text-fg-muted">Revenue</p>
        <p className="mt-1.5 font-mono text-[13px] font-semibold">$48,210</p>
        <p className="mt-2 text-[9.5px] uppercase tracking-wider text-fg-subtle">Stays</p>
      </div>
      <span className="h-px w-5 bg-border-strong" />
      <div className="rounded-[12px] border border-border bg-surface p-2.5">
        <span className="block h-2 w-[85%] rounded-full bg-fg/75 transition-[width] duration-500 ease-out-soft group-hover:w-[70%]" />
        <span className="mt-1.5 block h-1.5 w-[60%] rounded-full bg-surface-3" />
        <span className="mt-2 block h-2.5 w-[45%] rounded-full bg-fg/75" />
        <p className="mt-2 text-[9.5px] uppercase tracking-wider text-accent-ink">Sent</p>
      </div>
    </div>
  );
}

// The review step: the picture, the numbers, and two buttons.
export function CheckScene() {
  return (
    <div className="w-full max-w-[15.5rem] rounded-[14px] border border-border bg-surface p-2.5">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-1.5 rounded-[8px] border border-border bg-bg p-1.5">
        <span className="row-span-3 rounded-[4px] bg-surface-3" />
        <span className="h-2 w-2/3 rounded-full bg-fg/60" />
        <span className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-4 rounded-[3px] bg-surface-3" />
          ))}
        </span>
        <span className="flex h-7 items-end gap-0.5 rounded-[3px] bg-surface-3 p-1">
          {[40, 60, 50, 75, 65, 90].map((h, i) => (
            <span key={i} className="flex-1 rounded-[1px] bg-accent/60" style={{ height: `${h}%` }} />
          ))}
        </span>
      </div>
      <p className="mt-2 flex justify-between text-[10px] text-fg-muted">
        <span>12 type styles</span>
        <span>14 spacing values</span>
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <span className="flex h-6 items-center justify-center rounded-full border border-border text-[10.5px] font-medium">Cancel</span>
        <span className="flex h-6 items-center justify-center rounded-full bg-accent text-[10.5px] font-semibold text-on-accent">Send</span>
      </div>
    </div>
  );
}

// The result: a private version, one click from public.
export function PrivateScene() {
  return (
    <div className="w-full max-w-[16rem] rounded-[14px] border border-border bg-surface p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-fg-muted">
          <LockKeyhole className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-semibold">example.com: your pages</span>
          <span className="block text-[10.5px] text-fg-subtle">v4 · private · 3 pages</span>
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
        <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
          <Check className="size-3 text-accent-ink" strokeWidth={2.25} /> Only you can see it
        </span>
        <span className="rounded-full border border-border px-2.5 py-1 text-[10.5px] font-medium transition-colors duration-200 group-hover:border-accent group-hover:text-accent-ink">Publish</span>
      </div>
    </div>
  );
}
