import { supabaseConfigured } from "@/lib/supabase/configured";
import { logger } from "@/lib/logger";
import { listKits, type KitCard } from "@/services/kitRead";
import { Faq } from "./_components/Faq";
import { FinalCta } from "./_components/FinalCta";
import { Guardrails } from "./_components/Guardrails";
import { Hero } from "./_components/Hero";
import { HowItWorks } from "./_components/HowItWorks";
import { LibraryTeaser } from "./_components/LibraryTeaser";
import { OpenAKit } from "./_components/OpenAKit";
import { StyleNeverAssets } from "./_components/StyleNeverAssets";
import { TheFlow } from "./_components/TheFlow";

// The library teaser and count refresh every five minutes.
export const revalidate = 300;

async function recentKits(): Promise<{ kits: KitCard[]; total: number }> {
  if (!supabaseConfigured()) return { kits: [], total: 0 };
  try {
    const { cards, total } = await listKits({ limit: 6 });
    return { kits: cards, total };
  } catch (error) {
    logger.warn("home.library_unavailable", { error: error instanceof Error ? error.message : String(error) });
    return { kits: [], total: 0 };
  }
}

export default async function HomePage() {
  const { kits, total } = await recentKits();
  return (
    <>
      <Hero kitCount={total} />
      <OpenAKit />
      <HowItWorks />
      <TheFlow />
      <StyleNeverAssets />
      <LibraryTeaser kits={kits} />
      <Guardrails />
      <Faq />
      <FinalCta />
    </>
  );
}
