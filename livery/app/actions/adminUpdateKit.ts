"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminSession";
import { cleanCurator } from "@/lib/combine/identity";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";

const Patch = z.object({
  displayName: z.string().trim().max(80).nullable().optional(),
  curator: z.string().max(80).nullable().optional(),
  featured: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

/** Edits what surrounds a kit (name, place in the library). Published files never change. */
export async function adminUpdateKit(kitId: string, patch: z.infer<typeof Patch>) {
  await requireAdmin();
  const p = Patch.parse(patch);
  const update: Partial<{ display_name: string | null; featured: boolean; hidden: boolean; curator: string | null; curator_slug: string | null }> = {};
  if (p.displayName !== undefined) update.display_name = p.displayName ? p.displayName : null;
  if (p.featured !== undefined) update.featured = p.featured;
  if (p.hidden !== undefined) update.hidden = p.hidden;
  if (p.curator !== undefined) {
    const named = cleanCurator(p.curator);
    update.curator = named?.curator ?? null;
    update.curator_slug = named?.curatorSlug ?? null;
  }
  const db = getAdminClient();
  const { data: kit, error } = await db.from("kits").update(update).eq("id", kitId).select("slug, kind").single();
  if (error) throw new Error(error.message);
  logger.info("admin.kit_updated", { slug: kit.slug, fields: Object.keys(update) });
  revalidatePath("/", "layout");
}
