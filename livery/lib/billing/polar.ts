import "server-only";
import { createPolar } from "@polar-sh/sdk/2026-10";
import type { BillingInterval } from "./plans";

// Polar is the merchant of record: it runs checkout, invoices, tax and the
// customer portal. Configured with environment variables (see docs/billing.md).

export function polarConfigured() {
  return Boolean(process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_PRODUCT_PRO_MONTHLY && process.env.POLAR_PRODUCT_PRO_YEARLY);
}

export function polar() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) throw new Error("POLAR_ACCESS_TOKEN is not set");
  return createPolar({ accessToken, environment: process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production", timeout: 20 });
}

export function productFor(interval: BillingInterval) {
  const id = interval === "year" ? process.env.POLAR_PRODUCT_PRO_YEARLY : process.env.POLAR_PRODUCT_PRO_MONTHLY;
  if (!id) throw new Error(`POLAR_PRODUCT_PRO_${interval === "year" ? "YEARLY" : "MONTHLY"} is not set`);
  return id;
}

/** Which interval a product is, or null if it isn't one of the Pro products. */
export function intervalOf(productId: string): BillingInterval | null {
  if (productId === process.env.POLAR_PRODUCT_PRO_MONTHLY) return "month";
  if (productId === process.env.POLAR_PRODUCT_PRO_YEARLY) return "year";
  return null;
}
