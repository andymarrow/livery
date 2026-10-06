import "server-only";
import { chromium, type Browser } from "playwright-core";

/**
 * The one place that knows where Chromium runs. In production it is a hosted
 * browser reached over CDP (BROWSER_WS_ENDPOINT); moving hosts later means
 * changing that variable, not code. In local development without an endpoint,
 * the installed Google Chrome is used.
 */
export async function getBrowser(): Promise<Browser> {
  const endpoint = process.env.BROWSER_WS_ENDPOINT;
  if (endpoint) return chromium.connectOverCDP(endpoint, { timeout: 15_000 });
  if (process.env.NODE_ENV === "production") throw new Error("BROWSER_WS_ENDPOINT is not set");
  return chromium.launch({ channel: "chrome", headless: true });
}
