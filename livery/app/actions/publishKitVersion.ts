"use server";

import { revalidatePath } from "next/cache";
import { refreshKitPages } from "@/lib/kit/revalidate";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";
import { currentUser } from "@/utils/supabase/server";

/** Makes a private version public. Only its kit's owner may; it can't be undone. */
export async function publishKitVersion(versionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in again to publish." };
  const db = getAdminClient();
  const { data: version } = await db.from("kit_versions").select("id, visibility, status, kits!inner(owner_id, slug)").eq("id", versionId).maybeSingle();
  const kit = version?.kits as unknown as { owner_id: string | null; slug: string } | undefined;
  if (!version || !kit || kit.owner_id !== user.id) return { ok: false, error: "Only the kit's owner can publish it." };
  if (version.status !== "ready" || version.visibility !== "private") return { ok: false, error: "This version is already public." };
  const { error } = await db.from("kit_versions").update({ visibility: "public" }).eq("id", versionId);
  if (error) return { ok: false, error: "Couldn't publish right now. Try again." };
  logger.info("kit.published_by_owner", { slug: kit.slug, versionId });
  refreshKitPages();
  revalidatePath("/me", "layout");
  return { ok: true };
}
