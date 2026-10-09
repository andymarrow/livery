"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, missingMigration } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/adminSession";
import { errorText } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";

/** Gives someone Pro by hand (testers, friends, while payments are off), or takes a hand-given Pro away. */
export async function adminSetUserPro(userId: string, pro: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const id = z.uuid().parse(userId);
  const db = getAdminClient();
  const { data: existing } = await db.from("subscriptions").select("source, plan").eq("user_id", id).maybeSingle();
  if (!pro && existing?.source === "polar" && existing.plan === "pro") return { ok: false, error: "This person pays for Pro through Polar. Cancel it in Polar instead." };
  const { error } = await db
    .from("subscriptions")
    .upsert({ user_id: id, plan: pro ? "pro" : "free", source: pro ? "admin" : "polar", status: pro ? "granted" : null, current_period_end: null, cancel_at_period_end: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, error: missingMigration(error) ? "Run supabase/migrations/20261009100000_plans.sql in Supabase first." : errorText(error) };
  const { data } = await db.auth.admin.getUserById(id);
  await audit(pro ? "pro_granted" : "pro_removed", data?.user?.email ?? id);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
