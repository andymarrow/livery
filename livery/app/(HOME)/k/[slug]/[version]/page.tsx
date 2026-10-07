import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { kitPath, parseVersion } from "@/lib/kit/urls";
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
  if (!view || view.visibility === "private") return { title: "Kit not found" };
  return {
    title: `${view.title} design kit · v${view.version}`,
    description: view.analysis?.summary ?? `An installable design kit built from ${view.title}.`,
    alternates: { canonical: kitPath(view.slug, view.version) },
  };
}

export default async function KitPage({ params }: PageProps<"/k/[slug]/[version]">) {
  const view = await load(params);
  if (!view) notFound();

  // Private versions exist only for their owner (at /me/kits/…), never here.
  if (view.visibility === "private") notFound();
  return <KitView view={view} mode="public" />;
}
