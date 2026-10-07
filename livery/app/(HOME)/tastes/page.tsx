import type { Metadata } from "next";
import Link from "next/link";
import { KitCard } from "@/components/KitCard";
import { PageIntro } from "@/components/PageIntro";
import { ArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { listKits, type KitCard as KitCardData } from "@/services/kitRead";
import { CollectSteps } from "./_components/CollectSteps";

export const metadata: Metadata = {
  title: "Tastes",
  description: "One person's eye, measured across the sites they pick: the habits every site shares, as a kit your agent can apply.",
};
export const dynamic = "force-dynamic";

async function tastes(): Promise<KitCardData[]> {
  if (!supabaseConfigured()) return [];
  try {
    return (await listKits({ shelf: "tastes", limit: 24 })).cards;
  } catch (error) {
    logger.warn("tastes.unavailable", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export default async function TastesPage() {
  const cards = await tastes();
  const people = [...new Map(cards.filter((c) => c.curator && c.curatorSlug).map((c) => [c.curatorSlug!, c.curator!])).entries()];

  return (
    <>
      <PageIntro
        kicker="Tastes"
        title="Borrow Someone's Eye."
        muted="Not Just One Site."
        lead="Pick two to five sites one designer made. Livery measures each, keeps the habits they all share, and notes where they differ, so your agent can design the way that person would."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/create?kind=taste">
              Make a Taste <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/explore">Collect from the library</Link>
          </Button>
        </div>
      </PageIntro>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[80rem]">
          <CollectSteps />
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-[80rem]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="label-micro">The shelf</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Tastes People Have Made</h2>
            </div>
            {people.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {people.map(([slug, name]) => (
                  <Link key={slug} href={`/explore?by=${slug}`} className="rounded-full border border-border bg-surface px-3 py-1 text-[13px] text-fg-muted transition-colors hover:border-accent hover:text-fg">
                    {name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {cards.length ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((kit) => (
                <KitCard key={kit.slug} kit={kit} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[18px] border border-dashed border-border-strong p-10 text-center">
              <p className="text-lg font-semibold tracking-tight">The First Taste Could Be Yours</p>
              <p className="mt-2 text-sm text-fg-muted">Tap + Taste on a few kits you love, then build it from the counter in the header.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
