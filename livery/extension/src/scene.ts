// 3D and canvas pages: the scene on screen is shot once before the page is
// frozen (a frozen copy of a WebGL canvas is blank) and kept only as a coarse
// mosaic, plus its main colours. Same rules as the server (lib/extract/scene.ts).
export type CanvasBox = { index: number; x: number; y: number; width: number; height: number };

const CELL = 18;

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function colorsOf(data: Uint8ClampedArray) {
  const bins = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const key = `${data[i] >> 5}${data[i + 1] >> 5}${data[i + 2] >> 5}`;
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n++;
    bin.r += data[i];
    bin.g += data[i + 1];
    bin.b += data[i + 2];
    bins.set(key, bin);
  }
  const total = data.length / 4;
  return [...bins.values()].filter((b) => b.n / total >= 0.04).sort((a, b) => b.n - a.n).slice(0, 5).map((b) => hex(b.r / b.n, b.g / b.n, b.b / b.n));
}

const dataUrlOf = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Crops each canvas out of a screen capture and keeps it as a mosaic; the largest one's colours too. */
export async function sceneShots(capture: string, boxes: CanvasBox[], viewportWidth: number) {
  if (!boxes.length) return { mosaics: [] as (string | null)[], colors: [] as string[] };
  const bitmap = await createImageBitmap(await (await fetch(capture)).blob());
  const scale = bitmap.width / viewportWidth;
  const mosaics: (string | null)[] = Array.from({ length: Math.max(...boxes.map((b) => b.index)) + 1 }, () => null);
  let colors: string[] = [];
  for (const [i, box] of boxes.entries()) {
    const w = Math.max(2, Math.ceil(box.width / CELL));
    const h = Math.max(2, Math.ceil(box.height / CELL));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, box.x * scale, box.y * scale, box.width * scale, box.height * scale, 0, 0, w, h);
    mosaics[box.index] = await dataUrlOf(await canvas.convertToBlob({ type: "image/png" }));
    if (i === 0) colors = colorsOf(ctx.getImageData(0, 0, w, h).data);
  }
  bitmap.close();
  return { mosaics, colors };
}
