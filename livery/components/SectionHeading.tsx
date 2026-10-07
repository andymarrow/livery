import { cn } from "@/lib/utils";

/** "01 —", counted in page order by CSS so hidden sections never leave gaps. */
export function KickerNumber() {
  return (
    <>
      <span aria-hidden className="kicker-index tabular text-accent-ink" />
      <span aria-hidden className="h-px w-4 bg-border-strong" />
    </>
  );
}

export function SectionHeading({
  kicker,
  numbered = false,
  title,
  muted,
  description,
  align = "left",
  className,
}: {
  kicker: string;
  /** Number this section ("01 —"); numbers come from a CSS counter in page order. */
  numbered?: boolean;
  title: string;
  muted?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      <p className="label-micro flex items-center gap-2">
        {numbered && <KickerNumber />}
        {kicker}
      </p>
      <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
        {title}
        {muted && <span className="text-fg-subtle"> {muted}</span>}
      </h2>
      {description && <p className="mt-4 text-sm leading-relaxed text-fg-muted text-pretty sm:text-base">{description}</p>}
    </div>
  );
}
