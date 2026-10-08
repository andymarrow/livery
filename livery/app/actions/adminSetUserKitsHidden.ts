"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/adminSession";
import { getAdminClient } from "@/lib/supabase/admin";

/** Hides (or shows again) every kit a user owns. */
export async function adminSetUserKitsHidden(userId: string, hidden: boolean) {
  await requireAdmin();
  const id = z.uuid().parse(userId);
  const { data, error } = await getAdminClient().from("kits").update({ hidden }).eq("owner_id", id).select("slug");
  if (error) throw new Error(error.message);
  await audit(hidden ? "user_kits_hidden" : "user_kits_shown", id, { count: data?.length ?? 0 });
  revalidatePath("/", "layout");
}
