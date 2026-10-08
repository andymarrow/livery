import type { Metadata } from "next";
import { CREATOR, SITE } from "@/constants/constants";

/** A share image for any page, drawn by /og (see app/og/route.tsx). */
export function ogImage(title: string, kicker?: string) {
  const params = new URLSearchParams({ title: title.slice(0, 90), ...(kicker ? { kicker: kicker.slice(0, 40) } : {}) });
  return { url: `/og?${params}`, width: 1200, height: 630, alt: title };
}

/**
 * Metadata for one page: a unique title and description, a self-canonical on
 * the canonical origin, and matching Open Graph and Twitter cards.
 */
export function pageMetadata({ title, description, path, kicker, image, noindex = false }: { title: string; description: string; path: string; kicker?: string; image?: { url: string; width: number; height: number; alt: string }; noindex?: boolean }): Metadata {
  const img = image ?? ogImage(title, kicker);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE.name, url: path, title: `${title} · ${SITE.name}`, description, images: [img] },
    twitter: { card: "summary_large_image", title: `${title} · ${SITE.name}`, description, images: [img.url], creator: CREATOR.handle },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
