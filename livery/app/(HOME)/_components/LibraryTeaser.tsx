import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { KitCard } from "@/components/KitCard";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";
import type { KitCard as KitCardData } from "@/services/kitRead";

// Real kits only. With nothing built yet, the section stays out of the way.
export function LibraryTeaser({ kits }: { kits: KitCardData[] }) {
  if (kits.length === 0) return null;
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading kicker="The library" numbered title="Every Link Becomes a Kit" />
          <Button asChild variant="secondary" className="shrink-0 self-start sm:self-auto">
            <Link href="/explore">
              Explore All Kits <ArrowRight strokeWidth={2.25} />
            </Link>
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((kit, index) => (
            <Reveal key={kit.slug} delay={index * 50}>
              <KitCard kit={kit} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
