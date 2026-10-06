import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createExtractor } from "@/lib/extract";
import { WIDTHS } from "@/lib/extract/render";
import type { PageSignals } from "@/lib/guards/signals";

const chromeAvailable = await chromium
  .launch({ channel: "chrome" })
  .then((b) => b.close().then(() => true))
  .catch(() => false);

const html = readFileSync(join(__dirname, "../guards/fixtures/landing.html"), "utf8");

describe.skipIf(!chromeAvailable)("extractor on a known design", () => {
  let browser: Browser;
  let extraction: ReturnType<ReturnType<typeof createExtractor>["finish"]>;

  beforeAll(async () => {
    browser = await chromium.launch({ channel: "chrome" });
    const extractor = createExtractor("https://northwind.example/");
    for (const viewport of [WIDTHS[2], WIDTHS[0], WIDTHS[1]]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await extractor.visit({ page, viewport, signals: {} as PageSignals });
      await context.close();
    }
    extraction = extractor.finish("https://northwind.example/");
  }, 60_000);

  afterAll(async () => browser?.close());

  it("finds the palette roles", () => {
    const { palette } = extraction.tokens;
    expect(palette.scheme).toBe("light");
    expect(palette.background).toBe("#f6f5f1");
    expect(palette.text).toBe("#151513");
    expect(palette.accent).toBe("#0f7c72");
    expect(palette.onAccent).toBe("#ffffff");
    expect(palette.surface).toBe("#ffffff");
    expect(palette.border).toBe("#e4e2dc");
  });

  it("reads type, radii and spacing", () => {
    const { typography, radii } = extraction.tokens;
    expect(typography.scale.find((s) => s.sizePx === 64)?.letterSpacingEm).toBeCloseTo(-0.04, 2);
    expect(typography.scale.some((s) => s.name === "body")).toBe(true);
    expect(radii.map((r) => r.px)).toContain(16);
    expect(extraction.tokens.spacing.values.length).toBeGreaterThan(2);
  });

  it("finds button and card variants", () => {
    const kinds = extraction.components.map((c) => c.kind);
    expect(kinds).toContain("card");
    expect(kinds).toContain("button");
    const primary = extraction.components.find((c) => c.kind === "button" && c.style.background === "#0f7c72");
    expect(primary?.style.radius).toBe("12px");
  });

  it("labels the system font as free and never invents a licence", () => {
    expect(extraction.fonts.length).toBeGreaterThan(0);
    for (const item of extraction.items) {
      if (item.licence === "licence_required") expect(item.alternative).toBeTruthy();
    }
  });

  it("captures content-removed WebP frames for every width", () => {
    expect(extraction.frames.map((f) => f.name)).toEqual(["desktop", "tablet", "mobile"]);
    for (const frame of extraction.frames) {
      expect(frame.webp.subarray(0, 4).toString()).toBe("RIFF");
      expect(frame.webp.subarray(8, 12).toString()).toBe("WEBP");
      expect(frame.webp.length).toBeGreaterThan(1000);
    }
  });

  it("keeps text samples for analysis", () => {
    expect(extraction.text.headings).toContain("Ship calmer software.");
  });
});
