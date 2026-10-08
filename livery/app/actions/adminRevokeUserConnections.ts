"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/adminSession";
import { getAdminClient } from "@/lib/supabase/admin";

/** Disconnects every browser extension connected to a user's account. */
export async function adminRevokeUserConnections(userId: string) {
  await requireAdmin();
  const id = z.uuid().parse(userId);
  const { data } = await getAdminClient().from("extension_tokens").update({ revoked_at: new Date().toISOString() }).eq("user_id", id).is("revoked_at", null).select("id");
  await audit("user_connections_revoked", id, { count: data?.length ?? 0 });
  revalidatePath("/admin", "layout");
}
