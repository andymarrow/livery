import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

// The illustrated card from How it works: a small scene built from real
// interface pieces in an inset panel, then a number, a title and a line.
export function SceneCard({ index, title, body, children, delay = 0, as = "li", className }: { index?: number; title: string; body: React.ReactNode; children: React.ReactNode; delay?: number; as?: "li" | "div"; className?: string }) {
  return (
    <Reveal as={as} delay={delay} className={cn("group flex min-w-0 flex-col rounded-[18px] border border-border bg-surface p-2 shadow-card transition-[border-color] duration-150 hover:border-border-strong", className)}>
      <div className="flex h-48 items-center justify-center overflow-hidden rounded-[14px] border border-border bg-surface-2 p-5">{children}</div>
      <div className="px-3 pb-4 pt-5">
        {index !== undefined && <span className="font-mono text-xs text-fg-subtle">{String(index + 1).padStart(2, "0")}</span>}
        <h3 className={cn("text-lg font-semibold tracking-tight", index !== undefined && "mt-2")}>{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
      </div>
    </Reveal>
  );
}

// A section on an illustrated page: kicker, title (with a muted half), an
// optional line on the right, then its content.
export function SceneSection({ kicker, title, muted, lead, children, id }: { kicker: string; title: string; muted?: string; lead?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[80rem]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1fr] md:items-end">
          <div>
            <p className="label-micro">{kicker}</p>
            <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
              {title} {muted && <span className="text-fg-subtle">{muted}</span>}
            </h2>
          </div>
          {lead && <p className="max-w-md text-sm leading-relaxed text-fg-muted md:justify-self-end">{lead}</p>}
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
