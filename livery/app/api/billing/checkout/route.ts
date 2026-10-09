import type { NextRequest } from "next/server";
import { SITE } from "@/constants/constants";
import { polar, polarConfigured, productFor } from "@/lib/billing/polar";
import { getBillingSettings } from "@/lib/billing/settings";
import { errorText, logger } from "@/lib/logger";
import { currentUser } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/** /api/billing/checkout?interval=month|year: a Polar checkout for Pro, tied to the signed-in account. */
export async function GET(request: NextRequest) {
  const interval = request.nextUrl.searchParams.get("interval") === "year" ? "year" : "month";
  const user = await currentUser().catch(() => null);
  if (!user) return Response.redirect(new URL(`/sign-in?next=${encodeURIComponent(`/pricing?interval=${interval}`)}`, request.url), 303);
  if (!polarConfigured() || !(await getBillingSettings()).enabled) return Response.redirect(new URL("/pricing?billing=unavailable", request.url), 303);
  try {
    const checkout = await polar().checkouts.create({
      products: [productFor(interval)],
      external_customer_id: user.id,
      customer_email: user.email ?? undefined,
      success_url: `${SITE.url}/me?upgraded=1`,
      return_url: `${SITE.url}/pricing`,
      metadata: { livery_user_id: user.id },
    });
    return Response.redirect(checkout.url, 303);
  } catch (error) {
    logger.error("billing.checkout_failed", { error: errorText(error) });
    return Response.redirect(new URL("/pricing?billing=error", request.url), 303);
  }
}
