import { cn } from "@/lib/utils";

// A page's opening: kicker, title, lead, and a measuring ruler that draws in
// under it, Livery's nod to measuring designs. Ticks every 8px, longer every 40.
export function PageIntro({
  kicker,
  title,
  muted,
  lead,
  children,
  className,
}: {
  kicker: string;
  title: string;
  muted?: string;
  lead?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const ticks = Array.from({ length: 121 }, (_, i) => i);
  return (
    <section className={cn("border-b border-border px-4 pb-14 pt-14 sm:px-6 sm:pb-16 sm:pt-20", className)}>
      <div className="mx-auto max-w-[80rem]">
        <p className="label-micro animate-rise">{kicker}</p>
        <h1 className="animate-rise mt-4 max-w-4xl text-4xl font-bold leading-[1.04] tracking-[-0.03em] text-balance sm:text-6xl" style={{ animationDelay: "60ms" }}>
          {title}
          {muted && <span className="text-fg-subtle"> {muted}</span>}
        </h1>
        {lead && (
          <p className="animate-rise mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted text-pretty" style={{ animationDelay: "120ms" }}>
            {lead}
          </p>
        )}
        {children && <div className="animate-rise mt-8" style={{ animationDelay: "180ms" }}>{children}</div>}
        <svg aria-hidden className="mt-12 h-4 w-full text-border-strong" preserveAspectRatio="none" viewBox="0 0 960 16">
          {ticks.map((i) => (
            <line
              key={i}
              x1={i * 8}
              x2={i * 8}
              y1={0}
              y2={i % 5 === 0 ? 14 : 7}
              stroke="currentColor"
              strokeWidth={1}
              className="ruler-tick"
              style={{ animationDelay: `${200 + i * 6}ms`, vectorEffect: "non-scaling-stroke" }}
            />
          ))}
        </svg>
      </div>
    </section>
  );
}
