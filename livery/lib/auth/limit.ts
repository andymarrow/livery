import "server-only";
import { headers } from "next/headers";
import { clientIp } from "@/lib/http";
import { hashIp } from "@/lib/rateLimit";
import { getAdminClient } from "@/lib/supabase/admin";

/** A per-visitor budget for actions that send email (sign up, password reset). */
export async function withinEmailBudget(action: string) {
  if (!process.env.IP_HASH_SECRET) return true;
  const { data } = await getAdminClient().rpc("bump_rate", { p_key: `${action}:${hashIp(clientIp(await headers()))}`, p_window_seconds: 3600, p_max: 6 });
  return data?.[0]?.allowed ?? true;
}
