import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { detectBlock } from "@/lib/guards/detectBlock";
import { collectSignals, type PageSignals } from "@/lib/guards/signals";

const BASE: PageSignals = {
  requestedUrl: "https://example.com/",
  finalUrl: "https://example.com/",
  status: 200,
  headers: {},
  title: "Example",
  textLength: 4000,
  stylesheetCount: 3,
  elementCount: 300,
  frameSources: [],
  scriptSources: [],
  fieldTokens: [],
  hasPasswordField: false,
  sensitiveFormShare: 0,
  markers: [],
};
const signals = (overrides: Partial<PageSignals>) => ({ ...BASE, ...overrides });

describe("detectBlock on signals", () => {
  it("passes a normal page", () => expect(detectBlock(BASE)).toBeNull());

  it.each([
    [{ status: 403, headers: { "cf-mitigated": "challenge" } }, "bot_protection"],
    [{ headers: { "x-datadome": "protected" } }, "bot_protection"],
    [{ status: 405, headers: { "x-amzn-waf-action": "captcha" } }, "bot_protection"],
    [{ markers: ["perimeterx"] }, "bot_protection"],
    [{ status: 503, headers: { server: "cloudflare" }, title: "Attention Required! | Cloudflare" }, "bot_protection"],
    [{ status: 429 }, "bot_protection"],
    [{ status: 404 }, "not_found"],
    [{ status: 410 }, "not_found"],
    [{ status: 401 }, "login_required"],
    [{ finalUrl: "https://example.com/login?next=/" }, "login_required"],
    [{ finalUrl: "https://acme.okta.com/oauth2/v1/authorize" }, "login_required"],
    [{ frameSources: ["https://js.stripe.com/v3/elements-inner-card.html"] }, "sensitive_page"],
    [{ fieldTokens: ["cc-number"] }, "sensitive_page"],
    [{ requestedUrl: "https://example.com/checkout", finalUrl: "https://example.com/checkout" }, "sensitive_page"],
    [{ textLength: 20, elementCount: 3 }, "empty_render"],
    [{ stylesheetCount: 0, textLength: 120 }, "empty_render"],
  ] as [Partial<PageSignals>, string][])("%j -> %s", (overrides, reason) => {
    expect(detectBlock(signals(overrides))).toMatchObject({ ok: false, reason });
  });

  it("allows a small header login form on a real page", () => {
    expect(detectBlock(signals({ hasPasswordField: true, sensitiveFormShare: 0.04, fieldTokens: ["password"] }))).toBeNull();
  });
});

// Real rendering in Chrome: proves collectSignals sees what detectBlock needs.
const chromeAvailable = await chromium
  .launch({ channel: "chrome" })
  .then((b) => b.close().then(() => true))
  .catch(() => false);

describe.skipIf(!chromeAvailable)("fixtures rendered in Chrome", () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium.launch({ channel: "chrome" });
  });
  afterAll(async () => browser?.close());

  async function read(fixture: string, overrides: Partial<PageSignals> = {}) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.setContent(readFileSync(join(__dirname, "fixtures", fixture), "utf8"), { waitUntil: "load" });
    const collected = await page.evaluate(collectSignals);
    await page.close();
    return detectBlock({ ...BASE, ...collected, ...overrides });
  }

  it("Cloudflare challenge page", async () => {
    expect(await read("cloudflare.html", { status: 403 })).toMatchObject({ reason: "bot_protection" });
    // Even when the challenge returns 200 and no headers, the DOM gives it away.
    expect(await read("cloudflare.html")).toMatchObject({ reason: "bot_protection" });
  });

  it("Akamai access denied", async () => {
    expect(await read("akamai-denied.html", { status: 403, headers: { server: "AkamaiGHost" } })).toMatchObject({
      reason: "bot_protection",
    });
  });

  it("login page reached by redirect is a login wall", async () => {
    expect(
      await read("login.html", { requestedUrl: "https://app.example.com/", finalUrl: "https://app.example.com/session/new" }),
    ).toMatchObject({ reason: "login_required" });
  });

  it("login page requested directly is refused as sensitive", async () => {
    expect(await read("login.html")).toMatchObject({ reason: "sensitive_page" });
  });

  it("checkout page", async () => {
    expect(await read("checkout.html")).toMatchObject({ reason: "sensitive_page" });
  });

  it("empty single-page app", async () => {
    expect(await read("empty-spa.html")).toMatchObject({ reason: "empty_render" });
  });

  it("a real landing page with a small header login passes", async () => {
    expect(await read("landing.html")).toBeNull();
  });
});
