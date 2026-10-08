import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { kitPath, kitUrl, parseVersion } from "@/lib/kit/urls";
import { kitDescription, kitSchema } from "@/lib/seo/kit";
import { JsonLd } from "@/components/JsonLd";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { getKitVersion } from "@/services/kitRead";
import { KitView } from "../../../_components/kit/KitView";

// Rendered once per version and cached; refreshed every 30 minutes (shorter
// than the 2h signed frame URLs) and immediately when a version is withdrawn.
export const dynamic = "force-static";
export const revalidate = 1800;
export async function generateStaticParams() {
  return [];
}

async function load(params: PageProps<"/k/[slug]/[version]">["params"]) {
  const { slug, version } = await params;
  const number = parseVersion(version);
  if (!number || !supabaseConfigured()) return null;
  return getKitVersion(slug, number);
}

export async function generateMetadata({ params }: PageProps<"/k/[slug]/[version]">): Promise<Metadata> {
  const view = await load(params);
  if (!view || view.visibility === "private") return { title: "Kit not found", robots: { index: false } };
  const title = view.kind === "taste" ? `${view.title}: A Design Taste for AI Coding Agents` : `${view.title} Design System & Tokens for AI Coding Agents`;
  const description = kitDescription(view);
  // Every version points search engines at the newest public one, so versions never compete.
  const canonical = kitPath(view.slug, view.latestVersion);
  const withdrawn = Boolean(view.withdrawnAt);
  return {
    title,
    description,
    alternates: { canonical, types: { "text/markdown": kitUrl(view.slug, view.version, "SKILL.md") } },
    openGraph: { type: "article", url: canonical, title: `${title} · Livery`, description, publishedTime: view.publishedAt, modifiedTime: view.publishedAt },
    twitter: { card: "summary_large_image", title: `${title} · Livery`, description },
    ...(withdrawn ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function KitPage({ params }: PageProps<"/k/[slug]/[version]">) {
  const view = await load(params);
  if (!view) notFound();

  // Private versions exist only for their owner (at /me/kits/…), never here.
  if (view.visibility === "private") notFound();
  return (
    <>
      <JsonLd data={kitSchema(view)} />
      <KitView view={view} mode="public" />
    </>
  );
}
