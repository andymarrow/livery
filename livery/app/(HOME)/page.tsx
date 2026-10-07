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
    const { cards } = await listKits({ limit: 14 });
    return cards;
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
