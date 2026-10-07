import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { KitCard } from "@/components/KitCard";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";
import type { KitCard as KitCardData } from "@/services/kitRead";

// Real kits only. With nothing built yet, the section stays out of the way.
export function LibraryTeaser({ kits }: { kits: KitCardData[] }) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[80rem]">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading kicker="The library" numbered title="Every Link Becomes a Kit" />
          <Button asChild variant="secondary" className="shrink-0 self-start sm:self-auto">
            <Link href="/explore">
              Explore All Kits <ArrowRight strokeWidth={2.25} />
            </Link>
          </Button>
        </div>
        {kits.length > 0 ? (
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kits.map((kit, index) => (
              <Reveal key={kit.slug} delay={index * 60}>
                <KitCard kit={kit} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-[18px] border border-dashed border-border-strong p-10 text-center">
            <p className="text-lg font-semibold tracking-tight">The Library Starts With You</p>
            <p className="mt-2 text-sm text-fg-muted">Paste a site above and its kit becomes the first one here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
