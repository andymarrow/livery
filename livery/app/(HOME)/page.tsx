import { supabaseConfigured } from "@/lib/supabase/configured";
import { logger } from "@/lib/logger";
import { listKits, type KitCard } from "@/services/kitRead";
import { Hero } from "./_components/Hero";
import { LibraryTeaser } from "./_components/LibraryTeaser";
import { LibraryWall } from "./_components/LibraryWall";
import type { Metadata } from "next";
import { SITE } from "@/constants/constants";
import { pageMetadata } from "@/lib/seo/metadata";
import { NextSteps } from "./_components/NextSteps";
import { PricingTeaser } from "./_components/PricingTeaser";
import { WhatIsLivery } from "./_components/WhatIsLivery";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Turn Any Website Into a Design System for AI Coding Agents",
    description: "Paste any website and get an installable design kit for Claude Code, Cursor and Codex: colours, type, spacing and components, measured from the live site.",
    path: "/",
    kicker: "Design kits for coding agents",
  }),
  title: { absolute: `${SITE.name}: Turn Any Website Into a Design System for AI Coding Agents` },
};

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
      <WhatIsLivery />
      <PricingTeaser />
      <NextSteps />
    </>
  );
}
