import type { MetadataRoute } from "next";
import { SITE } from "@/constants/constants";
import { kitPath } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { listKits } from "@/services/kitRead";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/explore", "/owners", "/bot", "/about", "/legal/terms", "/legal/privacy", "/legal/takedown"].map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));
  if (!supabaseConfigured()) return pages;
  try {
    const { cards } = await listKits({ limit: 1000 });
    return [...pages, ...cards.map((kit) => ({ url: `${SITE.url}${kitPath(kit.slug, kit.version)}`, lastModified: kit.publishedAt, priority: 0.5 }))];
  } catch {
    return pages;
  }
}
