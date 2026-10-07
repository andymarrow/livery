// Joins the screen-by-screen captures into one WebP of the whole page, at CSS
// pixel size (the captures come at the screen's device pixel ratio).
export type Shot = { dataUrl: string; top: number };

export async function stitch(shots: Shot[], width: number, height: number, screen: number) {
  const target = Math.min(width, 1600);
  const scale = target / width;
  const canvas = new OffscreenCanvas(target, Math.round(height * scale));
  const ctx = canvas.getContext("2d")!;
  for (const shot of shots) {
    const bitmap = await createImageBitmap(await (await fetch(shot.dataUrl)).blob());
    const visible = Math.min(screen, height - shot.top);
    const sourceHeight = Math.round((visible / screen) * bitmap.height);
    ctx.drawImage(bitmap, 0, 0, bitmap.width, sourceHeight, 0, Math.round(shot.top * scale), target, Math.round(visible * scale));
    bitmap.close();
  }
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.72 });
  return { blob, width: target, height: Math.round(height * scale) };
}

export function toBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
