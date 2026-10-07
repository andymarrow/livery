import { cn } from "@/lib/utils";

export const fieldClass =
  "h-11 w-full rounded-[12px] border border-border bg-surface px-3.5 text-[15px] transition-[border-color] placeholder:text-fg-subtle hover:border-border-strong focus-visible:border-accent focus-visible:outline-none aria-invalid:border-danger";

export function Field({ label, children, aside }: { label: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium">
        {label}
        {aside}
      </span>
      {children}
    </label>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cn("rounded-[12px] px-3.5 py-2.5 text-[13.5px] leading-relaxed", tone === "error" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent-soft-fg")}>
      {children}
    </p>
  );
}

export function AuthHeading({ title, lead }: { title: string; lead: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{lead}</p>
    </div>
  );
}
