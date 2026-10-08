"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, missingMigration } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/adminSession";
import { errorText } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";
import { deleteAccount } from "@/services/account";

/** Deletes a user's account the way they could themselves: private kits and captures go, published kits stay ownerless. */
export async function adminDeleteUser(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const id = z.uuid().parse(userId);
  const { data } = await getAdminClient().auth.admin.getUserById(id);
  try {
    await deleteAccount(id);
  } catch (error) {
    return { ok: false, error: missingMigration(error) ? "Run the delete_account migration in Supabase first (supabase/migrations/20261008180000_delete_account.sql)." : errorText(error) };
  }
  await audit("user_deleted", data?.user?.email ?? id);
  revalidatePath("/", "layout");
  return { ok: true };
}
