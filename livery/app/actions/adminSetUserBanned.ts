"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/adminSession";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Bans a user (they can't sign in, and their browser extension connections
 * are revoked) or lifts the ban. Their published kits stay; hide them
 * separately if they shouldn't be in the library.
 */
export async function adminSetUserBanned(userId: string, banned: boolean, reason = "") {
  await requireAdmin();
  const id = z.uuid().parse(userId);
  const db = getAdminClient();
  const { data, error } = await db.auth.admin.updateUserById(id, { ban_duration: banned ? "876000h" : "none" });
  if (error) throw new Error(error.message);
  if (banned) await db.from("extension_tokens").update({ revoked_at: new Date().toISOString() }).eq("user_id", id).is("revoked_at", null);
  await audit(banned ? "user_banned" : "user_unbanned", data.user.email ?? id, { reason: reason.slice(0, 300) });
  revalidatePath("/admin", "layout");
}
