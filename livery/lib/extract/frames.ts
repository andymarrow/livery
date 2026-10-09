import "server-only";
import type { Page } from "playwright-core";
import { pinFixed } from "./collect/pinFixed";
import { stripContent } from "./collect/stripContent";
import type { Viewport } from "./render";

export type Frame = { name: string; width: number; height: number; webp: Buffer };

const MAX_HEIGHT: Record<Viewport["name"], number> = { desktop: 6000, tablet: 4000, mobile: 7000 };

/**
 * Removes the owner's content (images, logos, text) and captures a full-page
 * WebP, stitched from on-screen captures. Destructive: run it last on a page.
 */
export async function captureFrame(page: Page, viewport: Viewport, mosaics: (string | null)[] = []): Promise<Frame> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(stripContent, mosaics);
  // The frozen copy may carry the site's smooth scrolling; jumps must be instant.
  await page.evaluate(() => document.documentElement.style.setProperty("scroll-behavior", "auto", "important"));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const fullHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  // Never shorter than the screen itself, never longer than the cap.
  const height = Math.min(Math.max(fullHeight, viewport.height), MAX_HEIGHT[viewport.name]);
  // Only on-screen captures: scroll one screen at a time, shoot the viewport,
  // stitch. Anything "beyond the viewport" is unreliable on a remote browser
  // (Browserless re-lays the page out at its own window width, or returns
  // shifted, cropped slices) and very tall single captures come back black on
  // pages with heavy effects. Fixed and sticky elements are pinned where they
  // first appear, so a header shows once instead of on every screen.
  await page.evaluate(pinFixed);
  const screen = viewport.height;
  const tiles: { input: Buffer; top: number; left: number }[] = [];
  for (let wanted = 0; wanted < height; wanted += screen) {
    const top = await page.evaluate((y) => {
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
      return Math.round(window.scrollY);
    }, wanted);
    await page.waitForTimeout(60);
    const shot = await page.screenshot({ type: "png", animations: "disabled", caret: "hide" });
    tiles.push({ input: shot, top, left: 0 });
    if (top + screen >= height) break;
  }
  const { default: sharp } = await import("sharp");
  // Each shot is cut to the frame's bounds before stitching.
  const parts = await Promise.all(
    tiles.map(async (tile) => {
      const visible = Math.min(screen, height - tile.top);
      const input = await sharp(tile.input).extract({ left: 0, top: 0, width: viewport.width, height: Math.max(1, visible) }).toBuffer();
      return { input, top: tile.top, left: 0 };
    }),
  );
  const webp = await sharp({ create: { width: viewport.width, height, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite(parts)
    .webp({ quality: 72 })
    .toBuffer();
  return { name: viewport.name, width: viewport.width, height, webp };
}
