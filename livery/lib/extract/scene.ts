import "server-only";
import type { Page } from "playwright-core";

// 3D and canvas sites draw their look into pixels the DOM can't describe, and
// a copied canvas comes out blank. Before a page is frozen, each large canvas
// is shot from the screen once it has painted and kept only as a coarse
// mosaic: enough to show the scene's colour and composition in the frames,
// never the artwork itself. Its main colours go into the kit's notes.

export type SceneShot = {
  /** By index in document.querySelectorAll("canvas"): a tiny PNG data URL, or null. */
  mosaics: (string | null)[];
  /** The largest scene's main colours, most used first. */
  colors: string[];
};

const CELL = 18;
const MAX_CANVASES = 4;

type Box = { index: number; x: number; y: number; width: number; height: number };

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

async function shoot(page: Page, box: Box) {
  const clip = await page.evaluate(
    ({ index }) => {
      const canvas = document.querySelectorAll("canvas")[index];
      if (!canvas) return null;
      canvas.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      const r = canvas.getBoundingClientRect();
      const x = Math.max(0, r.left);
      const y = Math.max(0, r.top);
      const width = Math.min(window.innerWidth, r.right) - x;
      const height = Math.min(window.innerHeight, r.bottom) - y;
      return width >= 40 && height >= 40 ? { x, y, width, height } : null;
    },
    { index: box.index },
  );
  if (!clip) return null;
  return page.screenshot({ type: "png", clip, animations: "allow", caret: "hide", timeout: 5000 }).catch(() => null);
}

async function painted(png: Buffer) {
  const { default: sharp } = await import("sharp");
  const stats = await sharp(png).stats();
  return stats.channels.slice(0, 3).some((c) => c.stdev > 5);
}

async function mosaicOf(png: Buffer, box: Box) {
  const { default: sharp } = await import("sharp");
  const width = Math.max(2, Math.ceil(box.width / CELL));
  const height = Math.max(2, Math.ceil(box.height / CELL));
  const small = await sharp(png).resize(width, height, { fit: "fill", kernel: "cubic" }).png({ palette: true, colours: 24 }).toBuffer();
  return `data:image/png;base64,${small.toString("base64")}`;
}

async function colorsOf(png: Buffer) {
  const { default: sharp } = await import("sharp");
  const { data } = await sharp(png).resize(24, 24, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 3) {
    const key = `${data[i] >> 5}${data[i + 1] >> 5}${data[i + 2] >> 5}`;
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n++;
    bin.r += data[i];
    bin.g += data[i + 1];
    bin.b += data[i + 2];
    bins.set(key, bin);
  }
  const total = data.length / 3;
  return [...bins.values()]
    .filter((b) => b.n / total >= 0.04)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((b) => hex(b.r / b.n, b.g / b.n, b.b / b.n));
}

/** Waits for the page's large canvases to paint, then keeps a mosaic of each. */
export async function snapshotCanvases(page: Page, { waitMs = 6000 } = {}): Promise<SceneShot> {
  const boxes = await page
    .evaluate(() =>
      Array.from(document.querySelectorAll("canvas"))
        .map((canvas, index) => {
          const r = canvas.getBoundingClientRect();
          const s = getComputedStyle(canvas);
          return { index, x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height, shown: s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05 };
        })
        .filter((b) => b.shown && b.width >= 120 && b.height >= 80),
    )
    .catch(() => [] as (Box & { shown: boolean })[]);
  if (!boxes.length) return { mosaics: [], colors: [] };
  const largest = boxes.sort((a, b) => b.width * b.height - a.width * a.height).slice(0, MAX_CANVASES);
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));

  // 3D scenes load models and textures after the page settles: give the
  // largest one a few seconds to draw something other than one flat colour.
  let first = await shoot(page, largest[0]);
  const started = Date.now();
  while (first && !(await painted(first)) && Date.now() - started < waitMs) {
    await page.waitForTimeout(500);
    first = await shoot(page, largest[0]);
  }

  const mosaics: (string | null)[] = [];
  let colors: string[] = [];
  for (const box of largest) {
    const png = box === largest[0] ? first : await shoot(page, box);
    if (!png) continue;
    mosaics[box.index] = await mosaicOf(png, box).catch(() => null);
    if (box === largest[0]) colors = await colorsOf(png).catch(() => []);
  }
  await page.evaluate((s) => window.scrollTo({ left: s.x, top: s.y, behavior: "instant" }), scroll).catch(() => {});
  return { mosaics: Array.from({ length: Math.max(0, ...largest.map((b) => b.index + 1)) }, (_, i) => mosaics[i] ?? null), colors };
}
