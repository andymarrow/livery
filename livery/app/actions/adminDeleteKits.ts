"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/adminSession";
import { errorText } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";
import { deleteKit } from "@/services/moderation";

/** Deletes kits outright, with every version and file. Tastes built from one must go first. */
export async function adminDeleteKits(kitIds: string[]) {
  await requireAdmin();
  const ids = z.array(z.uuid()).min(1).max(200).parse(kitIds);
  const { data: kits } = await getAdminClient().from("kits").select("id, slug").in("id", ids);
  const slug = new Map((kits ?? []).map((k) => [k.id, k.slug]));
  const deleted: string[] = [];
  const failed: { id: string; slug: string; error: string }[] = [];
  // Combined kits first, so a taste and the pages it uses can go in one request.
  const order = [...ids].sort((a, b) => Number(/^taste-|-pages-|-mine-/.test(slug.get(b) ?? "")) - Number(/^taste-|-pages-|-mine-/.test(slug.get(a) ?? "")));
  for (const id of order) {
    try {
      const { versions } = await deleteKit(id);
      deleted.push(id);
      await audit("kit_deleted", slug.get(id) ?? id, { versions });
    } catch (error) {
      failed.push({ id, slug: slug.get(id) ?? id, error: errorText(error) });
    }
  }
  revalidatePath("/", "layout");
  return { deleted, failed };
}
