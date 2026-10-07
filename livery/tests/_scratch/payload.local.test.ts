import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { it } from "vitest";
import { collectDesign } from "@/lib/extract/collect/collectDesign";
import { captureFrame } from "@/lib/extract/frames";
import { renderAt, WIDTHS } from "@/lib/extract/render";
import { voiceProfile } from "@/lib/generate/measured";

// Plays the extension: measure a page, keep text only as voice numbers, capture a frame.
it("payloads", async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  for (const [name, url] of [["odit-home", "https://odit.et/"], ["odit-about", "https://odit.et/about"]] as const) {
    const vp = WIDTHS[2];
    const r = await renderAt(browser, new URL(url), vp);
    if (!r.ok) throw new Error(r.reason);
    const raw = await r.value.page.evaluate(collectDesign);
    const voice = voiceProfile(raw.text);
    raw.text = { headings: [], paragraphs: [], actions: [] };
    const frame = await captureFrame(r.value.page, vp);
    writeFileSync("/private/tmp/claude-501/-Users-andymarrow-development-related-your-own-creative-works-Livery/f1eda928-4540-4967-808c-8d43b502be0d/scratchpad/payload-" + name + ".json", JSON.stringify({ url, viewport: { width: vp.width, height: vp.height }, raw, voice, frame: frame.webp.toString("base64") }));
    await r.value.context.close();
  }
  await browser.close();
}, 300000);
