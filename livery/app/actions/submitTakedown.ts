"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { clientIp } from "@/lib/http";
import { logger } from "@/lib/logger";
import { hashIp } from "@/lib/rateLimit";
import { getAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { normaliseTarget } from "@/lib/url/normalise";

export type TakedownResult = { ok: true; domain: string } | { ok: false; error: string };

const Form = z.object({
  domain: z.string().min(3).max(253),
  email: z.email().max(254),
  message: z.string().min(10, "Tell us a little more (at least 10 characters).").max(4000),
  relationship: z.enum(["owner", "agent", "other"]),
});

export async function submitTakedown(_prev: TakedownResult | null, form: FormData): Promise<TakedownResult> {
  const parsed = Form.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const target = normaliseTarget(parsed.data.domain);
  if (!target.ok) return { ok: false, error: "That doesn't look like a website address." };
  if (!supabaseConfigured() || !process.env.IP_HASH_SECRET) return { ok: false, error: "Requests can't be received right now. Email takedown@livery.site instead." };

  const db = getAdminClient();
  const { data: rate } = await db.rpc("bump_rate", { p_key: `takedown:${hashIp(clientIp(await headers()))}`, p_window_seconds: 3600, p_max: 5 });
  if (rate && !rate[0]?.allowed) return { ok: false, error: "Too many requests from here. Try again later or email takedown@livery.site." };

  const { error } = await db.from("takedown_requests").insert({
    domain: target.value.domain,
    email: parsed.data.email,
    message: parsed.data.message,
    relationship: parsed.data.relationship,
  });
  if (error) {
    logger.error("takedown.insert_failed", { error: error.message });
    return { ok: false, error: "Something went wrong. Email takedown@livery.site instead." };
  }
  logger.info("takedown.received", { domain: target.value.domain });
  return { ok: true, domain: target.value.domain };
}
