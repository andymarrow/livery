import { SITE } from "@/constants/constants";
import { Ban, Check, Hourglass, LockKeyhole, ShieldCheck } from "@/components/icons";
import { cn } from "@/lib/utils";

// 01: someone asks for a kit.
export function AskedScene() {
  return (
    <div className="w-full max-w-[17rem]">
      <div className="flex h-11 items-center rounded-[14px] border border-border-strong bg-surface px-3.5 text-[14px] font-medium">
        <span className="text-fg-muted">{SITE.domain}/</span>
        <span className="text-fg">example.com</span>
        <span className="ml-px h-4 w-[2px] rounded-full bg-accent animate-caret" />
      </div>
      <p className="mt-3 flex items-center gap-2 pl-1 text-xs text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
        One visit, because someone asked
      </p>
    </div>
  );
}

// 02: robots.txt and the owner's file come first.
export function RulesScene() {
  const lines = [
    { text: "robots.txt", ok: true },
    { text: "Allow: /", ok: true, muted: true },
    { text: "livery.json", ok: true },
    { text: "none, so style only", ok: true, muted: true },
  ];
  return (
    <div className="w-full max-w-[18rem] rounded-[14px] border border-border bg-surface p-3.5 font-mono text-[11.5px] leading-[1.9]">
      {lines.map((line) => (
        <div key={line.text} className={cn("flex items-center gap-2 truncate", line.muted && "pl-5")}>
          {!line.muted && <Check className="size-3 shrink-0 text-accent-ink" strokeWidth={2.25} />}
          <span className={line.muted ? "truncate text-fg-subtle" : "truncate text-fg"}>{line.text}</span>
        </div>
      ))}
    </div>
  );
}

// A page, drawn with its content already removed: bars for text, blocks for images.
function Wire({ className, columns = 3 }: { className?: string; columns?: number }) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-[10px] border border-border bg-surface p-2", className)}>
      <div className="flex items-center justify-between">
        <span className="h-1.5 w-6 rounded-full bg-fg/70" />
        <span className="h-1.5 w-4 rounded-full bg-accent" />
      </div>
      <span className="mt-1 h-2 w-3/4 rounded-full bg-fg/80" />
      <span className="h-1.5 w-1/2 rounded-full bg-surface-3" />
      <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, i) => (
          <span key={i} className="h-5 rounded-[4px] bg-surface-3" />
        ))}
      </div>
    </div>
  );
}

// 03: three screen sizes, each measured.
export function SizesScene() {
  return (
    <div className="flex w-full max-w-[18rem] items-end justify-center gap-2.5">
      <div className="w-36 transition-transform duration-300 ease-out-soft group-hover:-translate-y-0.5">
        <Wire columns={3} />
        <p className="mt-1.5 text-center font-mono text-[10px] text-fg-subtle">1440</p>
      </div>
      <div className="w-20 transition-transform delay-[40ms] duration-300 ease-out-soft group-hover:-translate-y-0.5">
        <Wire columns={2} />
        <p className="mt-1.5 text-center font-mono text-[10px] text-fg-subtle">768</p>
      </div>
      <div className="w-12 transition-transform delay-[80ms] duration-300 ease-out-soft group-hover:-translate-y-0.5">
        <Wire columns={1} />
        <p className="mt-1.5 text-center font-mono text-[10px] text-fg-subtle">390</p>
      </div>
    </div>
  );
}

// 04: what's kept is measurements, never the page itself.
export function KeptScene() {
  const rows = [
    ["Colours", "14"],
    ["Type styles", "9"],
    ["Spacing", "8px grid"],
    ["Radii", "6 · 12 · pill"],
  ];
  return (
    <div className="w-full max-w-[17rem] overflow-hidden rounded-[14px] border border-border bg-surface">
      <div className="flex gap-1 border-b border-border p-2.5">
        {["#141412", "#f3f1ec", "#0f7c72", "#9a968c", "#e2e0d8"].map((c) => (
          <span key={c} className="h-4 flex-1 rounded-[4px] border border-border" style={{ background: c }} />
        ))}
      </div>
      {rows.map(([name, value]) => (
        <p key={name} className="flex justify-between border-b border-border px-3 py-1.5 text-[12px] last:border-0">
          <span className="text-fg-muted">{name}</span>
          <span className="font-mono text-fg">{value}</span>
        </p>
      ))}
    </div>
  );
}

// The guardrails, each with its moment.
export function StopScene() {
  return (
    <div className="w-full max-w-[16rem] rounded-[14px] border border-border bg-surface p-3.5">
      <div className="flex items-center gap-2 rounded-[10px] border border-dashed border-border-strong px-3 py-2.5">
        <ShieldCheck className="size-4 text-fg-subtle" />
        <span className="text-[12px] text-fg-muted">Verify you are human</span>
      </div>
      <p className="mt-3 flex items-center gap-2 text-[12px] font-medium text-fg">
        <Ban className="size-3.5 text-danger" strokeWidth={2.25} /> Stopped. Told the person who asked.
      </p>
    </div>
  );
}

export function LoginScene() {
  return (
    <div className="w-full max-w-[16rem] rounded-[14px] border border-border bg-surface p-3.5 opacity-90">
      <div className="flex items-center gap-2 text-[12px] text-fg-muted">
        <LockKeyhole className="size-3.5" /> /account/sign-in
      </div>
      <div className="mt-2.5 space-y-1.5">
        <span className="block h-6 rounded-[8px] border border-border bg-bg" />
        <span className="block h-6 rounded-[8px] border border-border bg-bg" />
      </div>
      <p className="mt-3 flex items-center gap-2 text-[12px] font-medium text-fg">
        <Ban className="size-3.5 text-danger" strokeWidth={2.25} /> Never read
      </p>
    </div>
  );
}

export function NoAssetsScene() {
  return (
    <div className="flex w-full max-w-[16rem] items-center gap-3">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-[14px] border border-border bg-surface">
        <span className="absolute bottom-0 left-0 h-10 w-16 rounded-tr-[30px] bg-accent/50" />
        <span className="absolute bottom-0 right-0 h-14 w-14 rounded-tl-full bg-fg/30" />
        <span className="absolute right-3 top-3 size-4 rounded-full bg-accent" />
      </div>
      <span className="h-px flex-1 bg-border-strong" />
      <div className="size-20 shrink-0 rounded-[14px] border border-border bg-surface-3" />
    </div>
  );
}

export function OnceScene() {
  return (
    <div className="w-full max-w-[16rem] rounded-[14px] border border-border bg-surface p-3.5">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className={cn("h-5 rounded-[4px]", i === 9 ? "bg-accent" : "bg-surface-3")} />
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 text-[12px] text-fg-muted">
        <Hourglass className="size-3.5" /> One visit a day, then cached
      </p>
    </div>
  );
}
