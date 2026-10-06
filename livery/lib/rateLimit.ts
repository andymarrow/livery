import "server-only";
import { createHash } from "node:crypto";
import { RATE_LIMITS } from "@/constants/constants";
import { getAdminClient } from "@/lib/supabase/admin";

/** sha256(ip + secret). Raw addresses are never stored. */
export function hashIp(ip: string) {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) throw new Error("IP_HASH_SECRET is not set");
  return createHash("sha256").update(`${ip}${secret}`).digest("hex");
}

export type RateDecision = { allowed: boolean; remaining: number; resetAt: Date };

/** Counts a build attempt. Cache hits never call this: reading kits is unlimited. */
export async function checkBuildRate(ip: string): Promise<RateDecision> {
  const { windowSeconds, max } = RATE_LIMITS.build;
  const { data, error } = await getAdminClient().rpc("bump_rate", {
    p_key: `build:${hashIp(ip)}`,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) throw error;
  const row = data[0];
  return { allowed: row.allowed, remaining: Math.max(0, max - row.current_count), resetAt: new Date(row.reset_at) };
}
