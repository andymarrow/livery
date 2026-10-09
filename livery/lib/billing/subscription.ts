import "server-only";
import { cache } from "react";
import { errorText, logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";
import { intervalOf, polar, polarConfigured } from "./polar";
import type { Plan } from "./plans";

export type Subscription = { plan: "free" | "pro"; source: "polar" | "admin"; status: string | null; interval: "month" | "year" | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean };

const FREE: Subscription = { plan: "free", source: "polar", status: null, interval: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };

/** A user's subscription as Livery last heard it from Polar. Missing table or row: free. */
export const getSubscription = cache(async (userId: string): Promise<Subscription> => {
  const { data, error } = await getAdminClient().from("subscriptions").select("plan, source, status, interval, current_period_end, cancel_at_period_end").eq("user_id", userId).maybeSingle();
  if (error || !data) return FREE;
  // A subscription past its period end is over, whatever the last webhook said.
  const lapsed = data.current_period_end && new Date(data.current_period_end).getTime() < Date.now() - 2 * 24 * 60 * 60 * 1000;
  return { plan: data.plan === "pro" && !lapsed ? "pro" : "free", source: data.source, status: data.status, interval: data.interval as Subscription["interval"], currentPeriodEnd: data.current_period_end, cancelAtPeriodEnd: data.cancel_at_period_end };
});

/** The plan that sets someone's limits: visitors have no account. */
export async function planOf(userId: string | null | undefined): Promise<Plan> {
  if (!userId) return "visitor";
  return (await getSubscription(userId)).plan;
}

/**
 * Asks Polar for this user's current subscriptions (they're the Polar
 * customer whose external id is the Livery user id) and stores the result.
 * Webhooks call it; so does the page people land on after checkout.
 */
export async function syncSubscription(userId: string): Promise<Subscription> {
  if (!polarConfigured()) return getSubscription(userId);
  // Pro granted by the admin stays, whatever Polar says.
  const { data: existing } = await getAdminClient().from("subscriptions").select("source, plan").eq("user_id", userId).maybeSingle();
  if (existing?.source === "admin" && existing.plan === "pro") return getSubscription(userId);
  let state;
  try {
    state = await polar().customers.getStateExternal(userId);
  } catch (error) {
    // No Polar customer yet: they've never checked out.
    logger.info("billing.no_customer", { userId, error: errorText(error) });
    return getSubscription(userId);
  }
  // active_subscriptions holds only live ones (active or trialing).
  const pro = state.active_subscriptions.find((s) => intervalOf(s.product_id));
  const row = {
    user_id: userId,
    plan: pro ? ("pro" as const) : ("free" as const),
    source: "polar" as const,
    status: pro ? String(pro.status) : null,
    interval: pro ? intervalOf(pro.product_id) : null,
    polar_customer_id: state.id,
    polar_subscription_id: pro?.id ?? null,
    current_period_end: pro?.current_period_end ?? null,
    cancel_at_period_end: pro?.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  };
  const { error } = await getAdminClient().from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) logger.error("billing.store_failed", { userId, error: errorText(error) });
  logger.info("billing.synced", { userId, plan: row.plan });
  return { plan: row.plan, source: "polar", status: row.status, interval: row.interval, currentPeriodEnd: row.current_period_end, cancelAtPeriodEnd: row.cancel_at_period_end } as Subscription;
}
