import "server-only";
import { chromium, type Browser } from "playwright-core";

// Browserless and similar hosts also expose REST endpoints (/screenshot,
// /content, ...). Those are for one-off jobs; Livery drives a live browser over
// the DevTools protocol, which needs the WebSocket root with the same token.
const REST_PATHS = /\/(screenshot|content|pdf|scrape|function|download|performance|unblock|export)\/?$/i;

export function cdpEndpoint(raw: string) {
  const url = new URL(raw.trim());
  if (url.protocol === "https:") url.protocol = "wss:";
  else if (url.protocol === "http:") url.protocol = "ws:";
  if (REST_PATHS.test(url.pathname)) url.pathname = "/";
  return url.toString();
}

/**
 * The one place that knows where Chromium runs. In production it is a hosted
 * browser reached over CDP (BROWSER_WS_ENDPOINT); moving hosts later means
 * changing that variable, not code. In local development without an endpoint,
 * the installed Google Chrome is used.
 */
export async function getBrowser(): Promise<Browser> {
  const endpoint = process.env.BROWSER_WS_ENDPOINT;
  if (endpoint) return chromium.connectOverCDP(cdpEndpoint(endpoint), { timeout: 20_000 });
  if (process.env.NODE_ENV === "production") throw new Error("BROWSER_WS_ENDPOINT is not set");
  return chromium.launch({ channel: "chrome", headless: true });
}
