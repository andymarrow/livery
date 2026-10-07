import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { parseVersion } from "@/lib/kit/urls";
import { getKitVersion } from "@/services/kitRead";
import { currentUser } from "@/utils/supabase/server";
import { KitView } from "../../../../_components/kit/KitView";

export const metadata: Metadata = { title: "Your kit", robots: { index: false } };
export const dynamic = "force-dynamic";

// The owner's view of one of their kits: every version, private ones included.
export default async function OwnerKitPage({ params }: PageProps<"/me/kits/[slug]/[version]">) {
  const { slug, version } = await params;
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=/me/kits/${slug}/${version}`);
  const number = parseVersion(version);
  const view = number ? await getKitVersion(slug, number) : null;
  if (!view || view.ownerId !== user.id) notFound();
  return <KitView view={view} mode="owner" />;
}
