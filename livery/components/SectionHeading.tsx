import { cn } from "@/lib/utils";

export function SectionHeading({
  kicker,
  title,
  muted,
  description,
  align = "left",
  className,
}: {
  kicker: string;
  title: string;
  muted?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      <p className="label-micro">{kicker}</p>
      <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
        {title}
        {muted && <span className="text-fg-subtle"> {muted}</span>}
      </h2>
      {description && <p className="mt-4 text-sm leading-relaxed text-fg-muted text-pretty sm:text-base">{description}</p>}
    </div>
  );
}
