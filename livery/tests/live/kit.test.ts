// Opt-in: LIVE=1 OUT=/some/dir SITES=linear.app npx vitest run tests/live/kit.test.ts
// Builds complete kits from real sites without the database: render, extract,
// write rules from the measurements, guard and package. Writes each kit and its archives to OUT.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { FLOW_VERSION } from "@/constants/constants";
import { getBrowser } from "@/lib/browser";
import { createExtractor } from "@/lib/extract";
import { renderAt, WIDTHS } from "@/lib/extract/render";
import { detectBlock } from "@/lib/guards/detectBlock";
import { generateKit } from "@/lib/generate/kit";
import { packageKit } from "@/lib/generate/package";
import { measuredWriter } from "@/lib/generate/measured";
import { normaliseTarget } from "@/lib/url/normalise";
import { safeFetch } from "@/lib/url/ssrf";

if (process.env.LIVE) {
  try {
    process.loadEnvFile(".env"); // never overrides variables set on the command line
  } catch {}
}

const SITES = (process.env.SITES ?? "rize.roggy.site").split(",");

describe.skipIf(!process.env.LIVE)("live kits", { timeout: 300_000 }, () => {
  it.each(SITES)("builds a kit for %s", async (site) => {
    const target = normaliseTarget(site);
    if (!target.ok) throw new Error(target.reason);
    const preflight = await safeFetch(target.value.url);
    if (!preflight.ok) throw new Error(preflight.reason);
    await preflight.value.response.body?.cancel();

    const extractor = createExtractor(target.value.sourceUrl);
    const browser = await getBrowser();
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
    const writer = measuredWriter(extraction);
    const kit = await generateKit(extraction, writer, { slug: target.value.slug, version: 1 });
    const packaged = packageKit(kit.files, { skillName: kit.skillName, version: 1, flowVersion: FLOW_VERSION });

    const out = join(process.env.OUT ?? "/tmp", `kit-${target.value.slug}`);
    for (const file of kit.files) {
      mkdirSync(dirname(join(out, "files", file.path)), { recursive: true });
      writeFileSync(join(out, "files", file.path), file.content);
    }
    writeFileSync(join(out, "kit.tar.gz"), packaged.tar);
    writeFileSync(join(out, "kit.zip"), packaged.zip);
    writeFileSync(join(out, "manifest.json"), JSON.stringify(packaged.manifest, null, 2));
    console.log(`${site}: ${kit.files.length} files, tar ${packaged.tar.length} bytes, sha256 ${packaged.contentHash}, writer ${writer.name}, notes ${kit.notes.join("; ") || "none"}`);
  });
});
