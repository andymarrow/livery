"use server";

import { headers } from "next/headers";
import { adminConfigured, secretMatches, startAdminSession } from "@/lib/adminSession";
import { clientIp } from "@/lib/http";
import { logger } from "@/lib/logger";
import { hashIp } from "@/lib/rateLimit";
import { getAdminClient } from "@/lib/supabase/admin";

export type AdminSignInResult = { ok: true } | { ok: false; error: string };

export async function adminSignIn(_prev: AdminSignInResult | null, form: FormData): Promise<AdminSignInResult> {
  if (!adminConfigured()) return { ok: false, error: "ADMIN_SECRET is not set (16+ characters) on this deployment." };
  const ip = clientIp(await headers());
  if (process.env.IP_HASH_SECRET) {
    const { data } = await getAdminClient().rpc("bump_rate", { p_key: `admin-login:${hashIp(ip)}`, p_window_seconds: 900, p_max: 8 });
    if (data && !data[0]?.allowed) return { ok: false, error: "Too many attempts. Try again in 15 minutes." };
  }
  const given = String(form.get("secret") ?? "");
  if (!secretMatches(given)) {
    logger.warn("admin.sign_in_failed", {});
    return { ok: false, error: "That isn't the admin secret." };
  }
  await startAdminSession();
  logger.info("admin.signed_in", {});
  return { ok: true };
}
