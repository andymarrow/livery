import "server-only";
import type { Browser, BrowserContext, Page, Response } from "playwright-core";
import { BOT } from "@/constants/constants";
import { collectSignals, type PageSignals } from "@/lib/guards/signals";
import { isUnsafeHostname } from "@/lib/url/ssrf";
import { unrollInPage } from "./collect/unroll";
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

// Waits until the page stops changing and no longer looks like a loading
// screen. App-style sites often go network-idle while a splash (a spinner
// and no visible copy) sits perfectly still for several seconds before the
// real page draws, so "unchanged for a second" alone isn't enough.
export async function waitForSettle(page: Page, { quietMs = 1000, maxMs = 15000 } = {}) {
  const started = Date.now();
  let last = -1;
  let quietSince = Date.now();
  while (Date.now() - started < maxMs) {
    const state = await page
      .evaluate(() => {
        const leaves = Array.from(document.querySelectorAll("body *")).filter((el) => {
          if (el.childElementCount || !el.textContent?.trim()) return false;
          const r = el.getBoundingClientRect();
          return r.width > 1 && r.height > 1 && r.top < window.innerHeight && r.bottom > 0;
        }).length;
        const spinning = document.getAnimations().some((a) => a.playState === "running" && a.effect?.getTiming().iterations === Infinity);
        const busy = document.querySelector('[aria-busy="true"], [role="progressbar"]') !== null;
        return { size: document.body.innerText.length + document.getElementsByTagName("*").length, loading: leaves < 4 && (spinning || busy) };
      })
      .catch(() => ({ size: -1, loading: false }));
    if (state.size !== last) {
      last = state.size;
      quietSince = Date.now();
    } else if (Date.now() - quietSince >= quietMs && !state.loading) return;
    await page.waitForTimeout(200);
  }
}

// App shells scroll inside a full-height element (<main class="h-dvh
// overflow-auto">) instead of the document, so the page is one screen tall.
// This lets the biggest such element grow to its content, so lazy sections
// load, the design is measured in full and frames show the whole page.
export async function unrollScrollers(page: Page) {
  await page.evaluate(unrollInPage);
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
  // Pin the screen size through DevTools too. On a remote browser
  // (Browserless) the context's viewport alone isn't always applied: pages laid
  // out at the remote window's 800x600, so "desktop" was measured and
  // captured at tablet width. The session stays open for the page's life,
  // since the override ends when it detaches.
  const emulation = await context.newCDPSession(page);
  await emulation.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false });

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
    // Smooth scrolling makes every jump an animation; scroll positions would lag.
    await page.addStyleTag({ content: "html, body { scroll-behavior: auto !important; }" }).catch(() => {});
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await waitForSettle(page);
    await unrollScrollers(page);
    await scrollThrough(page);
    await waitForSettle(page, { quietMs: 500, maxMs: 3000 });

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
