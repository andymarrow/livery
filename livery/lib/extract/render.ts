import "server-only";
import type { Browser, BrowserContext, Page, Response } from "playwright-core";
import { BOT } from "@/constants/constants";
import { collectSignals, type PageSignals } from "@/lib/guards/signals";
import { isUnsafeHostname } from "@/lib/url/ssrf";
import { fail, type ReadResult } from "./types";

export const WIDTHS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

export type Viewport = (typeof WIDTHS)[number];

// Analytics, ads, session replay and chat widgets: not part of a design, and
// they slow renders down. Everything else that shapes the page (CSS, fonts,
// images, SVG) is allowed to load.
const BLOCKED_HOSTS =
  /(^|\.)(google-analytics\.com|googletagmanager\.com|doubleclick\.net|googlesyndication\.com|adservice\.google\.com|facebook\.net|connect\.facebook\.net|hotjar\.com|fullstory\.com|segment\.(io|com)|mixpanel\.com|amplitude\.com|clarity\.ms|intercom\.io|intercomcdn\.com|crisp\.chat|drift\.com|hs-analytics\.net|hs-scripts\.com|plausible\.io|posthog\.com|sentry\.io|bat\.bing\.com|tiktok\.com|ads-twitter\.com|snap\.licdn\.com)$/;

async function guardRequests(context: BrowserContext) {
  await context.route("**/*", (route) => {
    const request = route.request();
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      return route.abort();
    }
    if (url.protocol === "data:" || url.protocol === "blob:") return route.continue();
    // Subresources must not reach private networks either.
    if (isUnsafeHostname(url.hostname)) return route.abort("blockedbyclient");
    if (BLOCKED_HOSTS.test(url.hostname)) return route.abort("blockedbyclient");
    if (request.resourceType() === "media") return route.abort("blockedbyclient");
    return route.continue();
  });
}

// Scrolls through the page so lazy sections and scroll-triggered styles load.
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    const limit = Math.min(document.documentElement.scrollHeight, 20_000);
    for (let y = 0; y < limit; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
}

export type RenderedPage = { page: Page; viewport: Viewport; signals: PageSignals };

/**
 * Opens `url` at one viewport, waits for fonts and lazy content, and gathers
 * signals. The caller owns the returned page and must close its context.
 */
export async function renderAt(browser: Browser, url: URL, viewport: Viewport): Promise<ReadResult<RenderedPage & { context: BrowserContext }>> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    userAgent: `Mozilla/5.0 (compatible; ${BOT.userAgent})`,
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    javaScriptEnabled: true,
    serviceWorkers: "block",
  });
  await guardRequests(context);
  const page = await context.newPage();

  let response: Response | null = null;
  try {
    response = await page.goto(url.toString(), { waitUntil: "load", timeout: 25_000 });
  } catch (error) {
    await context.close();
    const message = error instanceof Error ? error.message : String(error);
    if (/timeout/i.test(message)) return fail("timeout", `${url.hostname} did not finish loading`);
    if (/blockedbyclient/i.test(message)) return fail("unsafe_url", "the page redirected to a non-public address");
    return fail("timeout", `could not load ${url.hostname}`);
  }

  try {
    await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await scrollThrough(page);
    await page.waitForTimeout(250);

    const finalUrl = new URL(page.url());
    if (finalUrl.protocol !== "https:" || isUnsafeHostname(finalUrl.hostname)) {
      await context.close();
      return fail("unsafe_url", "the page ended up on a non-public or non-https address");
    }

    const collected = await page.evaluate(collectSignals);
    const signals: PageSignals = {
      ...collected,
      requestedUrl: url.toString(),
      finalUrl: finalUrl.toString(),
      status: response?.status() ?? 0,
      headers: (await response?.allHeaders()) ?? {},
    };
    return { ok: true, value: { page, context, viewport, signals } };
  } catch (error) {
    await context.close();
    return fail("empty_render", error instanceof Error ? error.message.slice(0, 200) : "render failed");
  }
}
