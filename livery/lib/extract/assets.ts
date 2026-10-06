import "server-only";
import type { KitFile } from "@/lib/generate/kit";
import { safeFetch } from "@/lib/url/ssrf";
import type { AssetCandidates, AssetKind } from "./collect/collectAssets";

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const MAX_SVG_BYTES = 200 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/**
 * Strips anything active from an SVG: scripts, foreignObject, event handlers,
 * javascript: links and external references. Kit SVGs are data, never code.
 */
export function sanitizeSvg(markup: string): string | null {
  let svg = markup
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<\?[\s\S]*?\?>|<!DOCTYPE[\s\S]*?>|<!--[\s\S]*?-->/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "")
    .replace(/url\(\s*['"]?(?!#)[^)]*\)/gi, "none")
    .replace(/\s+(class|data-[a-z-]+|data-livery-probe)\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .trim();
  if (!/^<svg[\s>]/i.test(svg)) return null;
  if (!/\sxmlns=/.test(svg)) svg = svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return /<script|<foreignObject|javascript:/i.test(svg) ? null : svg;
}

async function download(url: string, limit: number) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const result = await safeFetch(parsed, { timeoutMs: 8_000, maxRedirects: 3, accept: "image/*" });
  if (!result.ok) return null;
  const { response } = result.value;
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (!response.ok || declared > limit) {
    await response.body?.cancel();
    return null;
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > limit) return null;
  return { body, type: (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() };
}

/** Turns owner-granted asset candidates into kit files under assets/. */
export async function buildAssetFiles(candidates: AssetCandidates, kinds: AssetKind[]): Promise<KitFile[]> {
  const files: KitFile[] = [];
  let total = 0;
  const push = (path: string, content: Buffer) => {
    if (total + content.length > MAX_TOTAL_BYTES) return;
    total += content.length;
    files.push({ path, content });
  };

  if (kinds.includes("custom_icons")) {
    candidates.icons.forEach((markup, i) => {
      const clean = sanitizeSvg(markup);
      if (clean) push(`assets/icons/icon-${String(i + 1).padStart(2, "0")}.svg`, Buffer.from(clean));
    });
  }
  if (kinds.includes("illustrations")) {
    let n = 0;
    for (const markup of candidates.illustrations) {
      const clean = sanitizeSvg(markup);
      if (clean) push(`assets/illustrations/illustration-${String(++n).padStart(2, "0")}.svg`, Buffer.from(clean));
    }
    for (const url of candidates.illustrationUrls) {
      const file = await download(url, MAX_SVG_BYTES);
      const clean = file && file.type.includes("svg") ? sanitizeSvg(file.body.toString("utf8")) : null;
      if (clean) push(`assets/illustrations/illustration-${String(++n).padStart(2, "0")}.svg`, Buffer.from(clean));
    }
  }
  if (kinds.includes("photos")) {
    let n = 0;
    for (const url of candidates.photoUrls) {
      const file = await download(url, MAX_PHOTO_BYTES);
      const ext = file ? PHOTO_TYPES[file.type] : undefined;
      if (file && ext) push(`assets/photos/photo-${String(++n).padStart(2, "0")}.${ext}`, file.body);
    }
  }
  return files;
}
