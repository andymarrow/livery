"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/adminSession";
import { missingMigration } from "@/lib/admin/audit";
import { errorText } from "@/lib/logger";
import type { BillingSettings } from "@/lib/billing/plans";
import { saveBillingSettings } from "@/lib/billing/settings";

/** Saves the payments switch, every plan's limits and the prices shown. */
export async function adminSaveBilling(next: BillingSettings): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    const saved = await saveBillingSettings(next);
    await audit("billing_saved", saved.enabled ? "payments on" : "payments off", { limits: saved.limits, prices: saved.prices });
  } catch (error) {
    return { ok: false, error: missingMigration(error) ? "Run supabase/migrations/20261009100000_plans.sql in Supabase first." : errorText(error) };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
