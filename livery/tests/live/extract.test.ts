// Opt-in: LIVE=1 OUT=/some/dir npx vitest run tests/live/extract.test.ts
// Runs the full network + extraction path on real sites and writes each
// extraction (minus text) and its frames to OUT for inspection.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getBrowser } from "@/lib/browser";
import { createExtractor } from "@/lib/extract";
import { renderAt, WIDTHS } from "@/lib/extract/render";
import { detectBlock } from "@/lib/guards/detectBlock";
import { normaliseTarget } from "@/lib/url/normalise";
import { safeFetch } from "@/lib/url/ssrf";

const SITES = (process.env.SITES ?? "rize.roggy.site,goatrank.lol,linear.app").split(",");

describe.skipIf(!process.env.LIVE)("live extraction", { timeout: 180_000 }, () => {
  it.each(SITES)("extracts %s", async (site) => {
    const target = normaliseTarget(site);
    if (!target.ok) throw new Error(target.reason);
    const preflight = await safeFetch(target.value.url);
    if (!preflight.ok) throw new Error(preflight.reason);
    await preflight.value.response.body?.cancel();
    const extractor = createExtractor(target.value.sourceUrl);
    const browser = await getBrowser();
    const started = Date.now();
    try {
      for (const viewport of [WIDTHS[2], WIDTHS[0], WIDTHS[1]]) {
        const rendered = await renderAt(browser, preflight.value.finalUrl, viewport);
        if (!rendered.ok) throw new Error(`${rendered.reason}: ${rendered.detail}`);
        expect(detectBlock(rendered.value.signals)).toBeNull();
        await extractor.visit(rendered.value);
        await rendered.value.context.close();
      }
    } finally {
      await browser.close();
    }
    const extraction = extractor.finish(preflight.value.finalUrl.toString());
    const out = join(process.env.OUT ?? "/tmp", target.value.slug);
    mkdirSync(out, { recursive: true });
    const { frames, text, ...rest } = extraction;
    writeFileSync(join(out, "extraction.json"), JSON.stringify({ ...rest, ms: Date.now() - started, textCounts: { h: text.headings.length, p: text.paragraphs.length, a: text.actions.length } }, null, 2));
    for (const frame of frames) writeFileSync(join(out, `${frame.name}.webp`), frame.webp);
  });
});
