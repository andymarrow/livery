import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createExtractor } from "@/lib/extract";
import { stripContent } from "@/lib/extract/collect/stripContent";
import { WIDTHS } from "@/lib/extract/render";
import type { PageSignals } from "@/lib/guards/signals";

const chromeAvailable = await chromium
  .launch({ channel: "chrome" })
  .then((b) => b.close().then(() => true))
  .catch(() => false);
const html = readFileSync(join(__dirname, "fixtures/logo-heavy.html"), "utf8");

describe.skipIf(!chromeAvailable)("content removal on a logo-heavy page", () => {
  let browser: Browser;
  let page: Page;
  beforeAll(async () => {
    browser = await chromium.launch({ channel: "chrome" });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(stripContent);
  });
  afterAll(async () => browser?.close());

  it("leaves no readable text: every text node is a painted bar", async () => {
    const leaks = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const out: string[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (!node.textContent?.trim() || node.parentElement?.closest("svg, script, style")) continue;
        const bar = node.parentElement?.closest("[data-livery-bar]") as HTMLElement | null;
        if (!bar || getComputedStyle(bar).color !== "rgba(0, 0, 0, 0)") out.push(node.textContent.trim());
      }
      return out;
    });
    expect(leaks).toEqual([]);
  });

  it("removes the logo and large SVGs but keeps small icons", async () => {
    const svgs = await page.evaluate(() => Array.from(document.querySelectorAll("svg")).map((s) => s.getBoundingClientRect().width));
    expect(svgs).toEqual([20]);
    expect(await page.locator("header [data-livery-block]").count()).toBe(1);
  });

  it("hides photo pixels and background images", async () => {
    const state = await page.evaluate(() => ({
      img: getComputedStyle(document.querySelector("img")!).objectPosition,
      backgrounds: Array.from(document.querySelectorAll("*")).filter((el) => getComputedStyle(el).backgroundImage.includes("url(")).length,
    }));
    expect(state.img).toBe("-99999px -99999px");
    expect(state.backgrounds).toBe(0);
  });
});

describe.skipIf(!chromeAvailable)("extraction without an opt-in", () => {
  it("labels the logo and photos style only and collects no assets", async () => {
    const browser = await chromium.launch({ channel: "chrome" });
    const extractor = createExtractor("https://brandco.example/");
    for (const viewport of [WIDTHS[2], WIDTHS[0], WIDTHS[1]]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const p = await context.newPage();
      await p.setContent(html, { waitUntil: "load" });
      await extractor.visit({ page: p, viewport, signals: {} as PageSignals });
      await context.close();
    }
    await browser.close();
    const extraction = extractor.finish("https://brandco.example/");
    expect(extraction.assetCandidates).toBeNull();
    expect(extraction.items.find((i) => i.kind === "logo")).toMatchObject({ licence: "style_only" });
    expect(extraction.items.find((i) => i.kind === "image")).toMatchObject({ licence: "style_only" });
    expect(extraction.items.every((i) => i.licence !== "free" || ["font", "icon_set", "icon"].includes(i.kind))).toBe(true);
  }, 60_000);
});
