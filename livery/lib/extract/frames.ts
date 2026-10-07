import "server-only";
import type { Page } from "playwright-core";
import { stripContent } from "./collect/stripContent";
import type { Viewport } from "./render";

export type Frame = { name: string; width: number; height: number; webp: Buffer };

const MAX_HEIGHT: Record<Viewport["name"], number> = { desktop: 6000, tablet: 4000, mobile: 7000 };
const TILE = 2000;

/**
 * Removes the owner's content (images, logos, text) and captures a full-page
 * WebP through the DevTools protocol. Destructive: run it last on a page.
 */
export async function captureFrame(page: Page, viewport: Viewport): Promise<Frame> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(stripContent);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const fullHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  // Never shorter than the screen itself, never longer than the cap.
  const height = Math.min(Math.max(fullHeight, viewport.height), MAX_HEIGHT[viewport.name]);
  const session = await page.context().newCDPSession(page);
  try {
    const shot = async (y: number, h: number, format: "png" | "webp") => {
      const { data } = await session.send("Page.captureScreenshot", {
        format,
        ...(format === "webp" ? { quality: 72 } : {}),
        captureBeyondViewport: true,
        clip: { x: 0, y, width: viewport.width, height: h, scale: 1 },
      });
      return Buffer.from(data, "base64");
    };
    if (height <= TILE) return { name: viewport.name, width: viewport.width, height, webp: await shot(0, height, "webp") };

    // Tall pages are captured in slices and stitched: one capture of several
    // thousand pixels comes back solid black on pages with heavy effects
    // (blurs, large composited layers), as Chrome runs past GPU limits.
    const tiles: { input: Buffer; top: number; left: number }[] = [];
    for (let y = 0; y < height; y += TILE) tiles.push({ input: await shot(y, Math.min(TILE, height - y), "png"), top: y, left: 0 });
    const { default: sharp } = await import("sharp");
    const webp = await sharp({ create: { width: viewport.width, height, channels: 3, background: { r: 255, g: 255, b: 255 } } })
      .composite(tiles)
      .webp({ quality: 72 })
      .toBuffer();
    return { name: viewport.name, width: viewport.width, height, webp };
  } finally {
    await session.detach().catch(() => {});
  }
}
