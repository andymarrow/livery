import "server-only";
import { cache } from "react";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS, MAX_SITES, type BillingSettings } from "./plans";

const PlanLimitsSchema = z.object({
  buildsPerHour: z.number().int().min(0).max(10000),
  capturesPerHour: z.number().int().min(0).max(10000),
  tasteSites: z.number().int().min(2).max(MAX_SITES),
  privateCombined: z.boolean(),
});

export const BillingSettingsSchema = z.object({
  enabled: z.boolean(),
  limits: z.object({ visitor: PlanLimitsSchema, free: PlanLimitsSchema, pro: PlanLimitsSchema }),
  prices: z.object({ month: z.number().min(0).max(10000), year: z.number().min(0).max(100000) }),
});

// A short in-process cache: settings change rarely, and every build checks them.
let memo: { at: number; value: BillingSettings } | null = null;

/** Billing settings as the admin left them, over the defaults. A missing table (before its migration) means defaults. */
export const getBillingSettings = cache(async (): Promise<BillingSettings> => {
  if (memo && Date.now() - memo.at < 30_000) return memo.value;
  const { data, error } = await getAdminClient().from("app_settings").select("value").eq("key", "billing").maybeSingle();
  const stored = error || !data ? {} : (data.value as Partial<BillingSettings>);
  const merged = {
    enabled: stored.enabled ?? DEFAULT_SETTINGS.enabled,
    limits: { ...DEFAULT_SETTINGS.limits, ...(stored.limits ?? {}) },
    prices: { ...DEFAULT_SETTINGS.prices, ...(stored.prices ?? {}) },
  };
  const parsed = BillingSettingsSchema.safeParse(merged);
  const value = parsed.success ? parsed.data : DEFAULT_SETTINGS;
  memo = { at: Date.now(), value };
  return value;
});

export async function saveBillingSettings(next: BillingSettings) {
  const value = BillingSettingsSchema.parse(next);
  const { error } = await getAdminClient().from("app_settings").upsert({ key: "billing", value: value as unknown as Json, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  memo = null;
  return value;
}
