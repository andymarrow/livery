import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { KitCard } from "@/components/KitCard";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";
import type { KitCard as KitCardData } from "@/services/kitRead";

// Real kits only. With nothing built yet, the section stays out of the way.
export function LibraryTeaser({ kits }: { kits: KitCardData[] }) {
  if (kits.length === 0) return null;
  return (
    <section className="border-t border-border px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading kicker="The library" title="Every link becomes a kit anyone can use." />
          <Button asChild variant="secondary" className="shrink-0 self-start sm:self-auto">
            <Link href="/explore">
              Explore all kits <ArrowRight weight="bold" />
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
