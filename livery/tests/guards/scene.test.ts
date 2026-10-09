import { chromium, type Browser, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WEBGL_ARGS } from "@/lib/browser";
import { stripContent } from "@/lib/extract/collect/stripContent";
import { snapshotCanvases } from "@/lib/extract/scene";

const chromeAvailable = await chromium
  .launch({ channel: "chrome" })
  .then((b) => b.close().then(() => true))
  .catch(() => false);
// A WebGL scene that draws only after a delay, like a 3D site loading its models.
const html = `<!doctype html><html><body style="margin:0;background:#101014">
<canvas id="c" width="800" height="500" style="display:block;width:800px;height:500px"></canvas>
<p>Copy</p>
<script>
setTimeout(() => {
  const gl = document.getElementById("c").getContext("webgl", { preserveDrawingBuffer: true });
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(0, 0, 800, 500); gl.clearColor(0.9, 0.3, 0.1, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.scissor(0, 0, 400, 500); gl.clearColor(0.1, 0.4, 0.9, 1); gl.clear(gl.COLOR_BUFFER_BIT);
}, 1200);
</script></body></html>`;

describe.skipIf(!chromeAvailable)("3D scenes", () => {
  let browser: Browser;
  let page: Page;
  beforeAll(async () => {
    browser = await chromium.launch({ channel: "chrome", headless: true, args: WEBGL_ARGS });
    page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    await page.setContent(html, { waitUntil: "load" });
  });
  afterAll(async () => browser?.close());

  it("waits for a late WebGL scene, keeps its colours and shows it as a mosaic", async () => {
    // A generous wait: software WebGL starts slowly when the whole suite runs at once.
    const shot = await snapshotCanvases(page, { waitMs: 15_000 });
    expect(shot.colors.length).toBeGreaterThanOrEqual(2);
    expect(shot.colors).toEqual(expect.arrayContaining([expect.stringMatching(/^#[0-9a-f]{6}$/)]));
    expect(shot.mosaics[0]).toMatch(/^data:image\/png;base64,/);
    await page.evaluate(stripContent, shot.mosaics);
    const block = await page.evaluate(() => {
      const el = document.querySelector("[data-livery-block]") as HTMLElement | null;
      return el ? { image: getComputedStyle(el).backgroundImage, canvases: document.querySelectorAll("canvas").length } : null;
    });
    expect(block?.canvases).toBe(0);
    expect(block?.image).toMatch(/^url\("data:image\/png/);
  }, 40_000);
});
