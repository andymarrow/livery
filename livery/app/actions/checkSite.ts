"use server";

import { headers } from "next/headers";
import { clientIp } from "@/lib/http";
import { checkSite as runCheck, type SiteCheck } from "@/lib/optin/check";
import { hashIp } from "@/lib/rateLimit";
import { getAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/configured";

export type CheckResult = SiteCheck | { error: string };

/** "Check my site" on the owners page. Rate limited, because it contacts the site. */
export async function checkSite(_prev: CheckResult | null, form: FormData): Promise<CheckResult> {
  const input = String(form.get("domain") ?? "").trim();
  if (!input) return { error: "Enter your site's address." };
  if (supabaseConfigured() && process.env.IP_HASH_SECRET) {
    const ip = clientIp(await headers());
    const { data } = await getAdminClient().rpc("bump_rate", { p_key: `check:${hashIp(ip)}`, p_window_seconds: 600, p_max: 20 });
    if (data && !data[0]?.allowed) return { error: "Too many checks. Try again in a few minutes." };
  }
  return runCheck(input);
}
