"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminSession";
import { getAdminClient } from "@/lib/supabase/admin";

/** Lets a remembered "couldn't read" URL be tried again right away. */
export async function adminForgetFailure(sourceUrl: string) {
  await requireAdmin();
  const { error } = await getAdminClient().from("read_failures").delete().eq("source_url", sourceUrl);
  if (error) throw error;
  revalidatePath("/admin");
}
