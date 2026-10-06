import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { KitAnatomy } from "./KitAnatomy";

export function OpenAKit() {
  return (
    <section className="border-t border-border px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-end">
          <SectionHeading kicker="Open a kit" title="Values, and the reasons behind them." />
          <p className="max-w-md text-[15px] leading-relaxed text-fg-muted md:justify-self-end">
            This is Livery&apos;s own kit, built from this page. Plain Markdown and JSON your agent reads one file at a time, only
            when a step needs it.
          </p>
        </div>
        <Reveal className="mt-12">
          <KitAnatomy />
        </Reveal>
      </div>
    </section>
  );
}
