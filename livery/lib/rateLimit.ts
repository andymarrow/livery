import "server-only";
import { createHash } from "node:crypto";
import { getBillingSettings } from "@/lib/billing/settings";
import { planOf } from "@/lib/billing/subscription";
import { getAdminClient } from "@/lib/supabase/admin";

/** sha256(ip + secret). Raw addresses are never stored. */
export function hashIp(ip: string) {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) throw new Error("IP_HASH_SECRET is not set");
  return createHash("sha256").update(`${ip}${secret}`).digest("hex");
}

export type RateDecision = { allowed: boolean; remaining: number; resetAt: Date };

/**
 * Counts a build attempt. Cache hits never call this: reading kits is
 * unlimited. Signed-in people are counted per account (by their plan), so a
 * shared office or café network doesn't use up their builds; visitors are
 * counted per network.
 */
export async function checkBuildRate(ip: string, userId?: string | null): Promise<RateDecision & { plan: Awaited<ReturnType<typeof planOf>>; upgrade: boolean }> {
  const [plan, settings] = await Promise.all([planOf(userId), getBillingSettings()]);
  const windowSeconds = 3600;
  const max = settings.limits[plan].buildsPerHour;
  const { data, error } = await getAdminClient().rpc("bump_rate", {
    p_key: userId ? `build:user:${userId}` : `build:${hashIp(ip)}`,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) throw error;
  const row = data[0];
  return { allowed: row.allowed, remaining: Math.max(0, max - row.current_count), resetAt: new Date(row.reset_at), plan, upgrade: settings.enabled && plan !== "pro" };
}
