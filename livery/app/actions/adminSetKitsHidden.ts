"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/adminSession";
import { getAdminClient } from "@/lib/supabase/admin";

/** Hides kits from the library and search (their pages still work), or shows them again. */
export async function adminSetKitsHidden(kitIds: string[], hidden: boolean) {
  await requireAdmin();
  const ids = z.array(z.uuid()).min(1).max(500).parse(kitIds);
  const { data, error } = await getAdminClient().from("kits").update({ hidden }).in("id", ids).select("slug");
  if (error) throw new Error(error.message);
  await audit(hidden ? "kits_hidden" : "kits_shown", (data ?? []).map((k) => k.slug).join(", "), { count: ids.length });
  revalidatePath("/", "layout");
}
