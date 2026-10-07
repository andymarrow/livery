import type { NextRequest } from "next/server";
import { json } from "@/lib/extension/http";
import { redeemPairingCode } from "@/lib/extension/tokens";
import { clientIp } from "@/lib/http";
import { hashIp } from "@/lib/rateLimit";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** The extension trades the one-time code from livery.site/extension/connect for its token. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { code?: unknown; label?: unknown } | null;
  if (typeof body?.code !== "string" || body.code.length > 20) return json({ error: "Send the code shown on livery.site/extension/connect." }, 400);
  if (process.env.IP_HASH_SECRET) {
    const { data } = await getAdminClient().rpc("bump_rate", { p_key: `pair:${hashIp(clientIp(request.headers))}`, p_window_seconds: 900, p_max: 15 });
    if (data && !data[0]?.allowed) return json({ error: "Too many attempts. Wait a few minutes." }, 429);
  }
  const redeemed = await redeemPairingCode(body.code, typeof body.label === "string" ? body.label : "Browser extension");
  if (!redeemed) return json({ error: "That code is wrong, already used, or expired. Get a new one on livery.site." }, 400);
  const { data: profile } = await getAdminClient().from("profiles").select("display_name").eq("id", redeemed.userId).maybeSingle();
  return json({ token: redeemed.token, user: { name: profile?.display_name ?? null } });
}
