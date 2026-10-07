import { supabaseConfigured } from "@/lib/supabase/configured";
import { logger } from "@/lib/logger";
import { listKits, type KitCard } from "@/services/kitRead";
import { Hero } from "./_components/Hero";
import { LibraryTeaser } from "./_components/LibraryTeaser";
import { LibraryWall } from "./_components/LibraryWall";
import { NextSteps } from "./_components/NextSteps";

// The library teaser and count refresh every five minutes.
export const revalidate = 300;

async function recentKits(): Promise<KitCard[]> {
  if (!supabaseConfigured()) return [];
  try {
    // Featured kits lead; the newest fill the rest.
    const [featured, recent] = await Promise.all([listKits({ featuredOnly: true, limit: 8 }), listKits({ limit: 14 })]);
    const seen = new Set(featured.cards.map((c) => c.slug));
    return [...featured.cards, ...recent.cards.filter((c) => !seen.has(c.slug))].slice(0, 14);
  } catch (error) {
    logger.warn("home.library_unavailable", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export default async function HomePage() {
  const kits = await recentKits();
  return (
    <>
      <Hero />
      <LibraryWall kits={kits} />
      <LibraryTeaser kits={kits.slice(0, 6)} />
      <NextSteps />
    </>
  );
}
