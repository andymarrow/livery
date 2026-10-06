import type { NextRequest } from "next/server";
import { hasBearer } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { normaliseTarget } from "@/lib/url/normalise";
import { applyTakedown } from "@/services/grants";

export const dynamic = "force-dynamic";

/**
 * Actions a takedown: the host is forbidden for good and every published
 * version is withdrawn (files deleted, links answer 410).
 *   curl -X POST https://livery.site/api/admin/takedown \
 *     -H "Authorization: Bearer $ADMIN_SECRET" -d '{"domain":"example.com","requestId":12}'
 */
export async function POST(request: NextRequest) {
  if (!hasBearer(request.headers, "ADMIN_SECRET")) return new Response("Unauthorized", { status: 401 });
  if (!supabaseConfigured()) return new Response("Not configured", { status: 503 });
  const body = (await request.json().catch(() => null)) as { domain?: unknown; requestId?: unknown } | null;
  const target = typeof body?.domain === "string" ? normaliseTarget(body.domain) : null;
  if (!target?.ok) return Response.json({ error: "domain is required" }, { status: 400 });

  const withdrawn = await applyTakedown(target.value.domain);
  if (typeof body?.requestId === "number") {
    await getAdminClient().from("takedown_requests").update({ status: "actioned" }).eq("id", body.requestId);
  }
  logger.info("takedown.actioned", { domain: target.value.domain, withdrawn });
  return Response.json({ domain: target.value.domain, withdrawn });
}
