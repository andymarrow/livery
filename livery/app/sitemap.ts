import type { MetadataRoute } from "next";
import { SITE } from "@/constants/constants";
import { GUIDES } from "@/lib/seo/guides";
import { kitPath } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { listKits } from "@/services/kitRead";
import { getBillingSettings } from "@/lib/billing/settings";

export const revalidate = 3600;

// Every public page, each guide, and each kit once: at its newest public
// version (the canonical one), dated when it was published.
const PAGES: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
  ["", 1, "daily"],
  ["/explore", 0.9, "daily"],
  ["/tastes", 0.8, "daily"],
  ["/create", 0.8, "monthly"],
  ["/how-it-works", 0.8, "monthly"],
  ["/agents", 0.8, "monthly"],
  ["/guides", 0.8, "weekly"],
  ["/extension", 0.7, "monthly"],
  ["/pricing", 0.7, "monthly"],
  ["/faq", 0.7, "monthly"],
  ["/owners", 0.6, "monthly"],
  ["/bot", 0.5, "monthly"],
  ["/about", 0.5, "monthly"],
  ["/legal/terms", 0.2, "yearly"],
  ["/legal/privacy", 0.2, "yearly"],
  ["/legal/takedown", 0.2, "yearly"],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payments = (await getBillingSettings().catch(() => ({ enabled: false }))).enabled;
  const pages: MetadataRoute.Sitemap = [
    ...PAGES.filter(([path]) => payments || path !== "/pricing").map(([path, priority, changeFrequency]) => ({ url: `${SITE.url}${path}`, priority, changeFrequency })),
    ...GUIDES.map((g) => ({ url: `${SITE.url}/guides/${g.slug}`, lastModified: g.updated, priority: 0.7, changeFrequency: "monthly" as const })),
  ];
  if (!supabaseConfigured()) return pages;
  try {
    const { cards } = await listKits({ limit: 2000 });
    return [...pages, ...cards.map((kit) => ({ url: `${SITE.url}${kitPath(kit.slug, kit.version)}`, lastModified: kit.publishedAt, priority: kit.featured ? 0.7 : 0.6, changeFrequency: "weekly" as const }))];
  } catch {
    return pages;
  }
}
