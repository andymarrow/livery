import "server-only";
import type { Page } from "playwright-core";
import { stripContent } from "./collect/stripContent";
import type { Viewport } from "./render";

export type Frame = { name: string; width: number; height: number; webp: Buffer };

const MAX_HEIGHT: Record<Viewport["name"], number> = { desktop: 6000, tablet: 4000, mobile: 7000 };

/**
 * Removes the owner's content (images, logos, text) and captures a full-page
 * WebP through the DevTools protocol. Destructive: run it last on a page.
 */
export async function captureFrame(page: Page, viewport: Viewport): Promise<Frame> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(stripContent);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const height = Math.min(fullHeight, MAX_HEIGHT[viewport.name]);
  const session = await page.context().newCDPSession(page);
  try {
    const { data } = await session.send("Page.captureScreenshot", {
      format: "webp",
      quality: 72,
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: viewport.width, height, scale: 1 },
    });
    return { name: viewport.name, width: viewport.width, height, webp: Buffer.from(data, "base64") };
  } finally {
    await session.detach().catch(() => {});
  }
}
