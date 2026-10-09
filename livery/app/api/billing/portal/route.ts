import type { NextRequest } from "next/server";
import { SITE } from "@/constants/constants";
import { polar, polarConfigured } from "@/lib/billing/polar";
import { errorText, logger } from "@/lib/logger";
import { currentUser } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/** /api/billing/portal: Polar's customer portal (change plan, invoices, cancel) for the signed-in account. */
export async function GET(request: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.redirect(new URL("/sign-in?next=/me", request.url), 303);
  if (!polarConfigured()) return Response.redirect(new URL("/me?billing=unavailable", request.url), 303);
  try {
    const session = await polar().customerSessions.create({ external_customer_id: user.id, return_url: `${SITE.url}/me` });
    return Response.redirect(session.customer_portal_url, 303);
  } catch (error) {
    logger.error("billing.portal_failed", { error: errorText(error) });
    return Response.redirect(new URL("/me?billing=error", request.url), 303);
  }
}
