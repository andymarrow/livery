import { webhooks } from "@polar-sh/sdk/2026-10";
import { syncSubscription } from "@/lib/billing/subscription";
import { errorText, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Polar's webhooks. Any subscription or customer-state event re-syncs that
 * customer from Polar (rather than trusting the event's own fields), so
 * events arriving late or out of order can't leave a plan wrong.
 */
export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "webhooks are not configured" }, { status: 503 });
  const body = await request.text();
  let event;
  try {
    event = await webhooks.validateEvent(body, { "webhook-id": request.headers.get("webhook-id") ?? "", "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "", "webhook-signature": request.headers.get("webhook-signature") ?? "" }, secret);
  } catch (error) {
    if (error instanceof webhooks.PolarWebhookVerificationError) return Response.json({ error: "invalid signature" }, { status: 403 });
    // Event types this API version doesn't know: acknowledge so Polar stops retrying.
    if (error instanceof webhooks.PolarWebhookError) return Response.json({ ignored: true }, { status: 202 });
    throw error;
  }
  const data = event.data as { external_id?: string | null; customer?: { external_id?: string | null } | null };
  const userId = event.type === "customer.state_changed" || event.type.startsWith("customer.") ? data.external_id : data.customer?.external_id;
  if ((event.type.startsWith("subscription.") || event.type.startsWith("customer.") || event.type === "order.paid") && userId && UUID.test(userId)) {
    try {
      await syncSubscription(userId);
    } catch (error) {
      logger.error("billing.webhook_sync_failed", { type: event.type, error: errorText(error) });
      return Response.json({ error: "sync failed" }, { status: 500 });
    }
  }
  return Response.json({ received: true });
}
