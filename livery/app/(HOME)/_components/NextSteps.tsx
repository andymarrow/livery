import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";

const STEPS = [
  { href: "/how-it-works", label: "How it works", body: "What Livery measures, what a kit holds and how your agent applies it." },
  { href: "/agents", label: "Install in your agent", body: "Claude Code in one paste; Codex, Cursor and Windsurf in a minute." },
  { href: "/owners", label: "For site owners", body: "Share more of your design, or opt out, with one file." },
];

// Where to go after the library: a hairline row of three doors.
export function NextSteps() {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="mx-auto grid max-w-[80rem] grid-cols-1 overflow-hidden rounded-[18px] border border-border bg-surface shadow-card md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Link
            key={step.href}
            href={step.href}
            className={`group relative flex flex-col gap-2 p-6 transition-colors duration-150 hover:bg-surface-2 sm:p-7 ${i > 0 ? "border-t border-border md:border-l md:border-t-0" : ""}`}
          >
            <span className="flex items-center justify-between">
              <span className="text-[15px] font-semibold tracking-tight">{step.label}</span>
              <span className="flex size-7 items-center justify-center rounded-full border border-border text-fg-subtle transition-[transform,background-color,color,border-color] duration-300 ease-out-soft group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent">
                <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
              </span>
            </span>
            <span className="text-sm leading-relaxed text-fg-muted">{step.body}</span>
            <span aria-hidden className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out-soft group-hover:scale-x-100 sm:inset-x-7" />
          </Link>
        ))}
      </div>
    </section>
  );
}
