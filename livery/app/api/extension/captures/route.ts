import type { NextRequest } from "next/server";
import { addCapture } from "@/controllers/captureKit";
import type { RawDesign } from "@/lib/extract/collect/collectDesign";
import type { VoiceProfile } from "@/lib/generate/measured";
import { json, requireExtensionUser, unauthorized } from "@/lib/extension/http";
import { CaptureRequestSchema } from "@/lib/extension/schema";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Receives one page measured by the extension (measurements and a
 * content-removed frame) and adds it to a kit as a new private version.
 */
export async function POST(request: NextRequest) {
  const user = await requireExtensionUser(request);
  if (!user) return unauthorized();
  if (Number(request.headers.get("content-length") ?? 0) > 4_500_000) return json({ error: "This capture is too large. Try a shorter page." }, 413);

  const { data: rate } = await getAdminClient().rpc("bump_rate", { p_key: `capture:${user.userId}`, p_window_seconds: 3600, p_max: 40 });
  if (rate && !rate[0]?.allowed) return json({ error: "You've added a lot of pages this hour. Try again later." }, 429);

  const parsed = CaptureRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "This capture couldn't be read. Update the extension and try again.", detail: parsed.error.issues[0]?.path.join(".") }, 400);
  const body = parsed.data;

  let frame: Buffer | null = null;
  if (body.frame) {
    try {
      // Re-encoded: anything that isn't a real image fails here, and metadata is dropped.
      const { default: sharp } = await import("sharp");
      const input = Buffer.from(body.frame, "base64");
      const meta = await sharp(input).metadata();
      if (meta.format !== "webp" || !meta.width || !meta.height || meta.width > 4000 || meta.height > 20000) throw new Error("not a page frame");
      frame = await sharp(input).webp({ quality: 72 }).toBuffer();
    } catch {
      return json({ error: "The page image couldn't be read." }, 400);
    }
  }

  try {
    const outcome = await addCapture({
      userId: user.userId,
      url: body.url,
      raw: body.raw as unknown as RawDesign,
      voice: body.voice as VoiceProfile | undefined,
      frame,
      viewport: body.viewport,
      target: body.target,
    });
    if (outcome.status === "invalid") return json({ error: outcome.message }, 422);
    if (outcome.status === "building") return json({ error: "This kit is being updated right now. Try again in a moment." }, 409);
    return json({ ...outcome, url: new URL(outcome.path, request.nextUrl.origin).toString() });
  } catch (error) {
    logger.error("extension.capture_failed", { error: error instanceof Error ? error.message : String(error) });
    return json({ error: "Something went wrong adding this page. Nothing was published." }, 500);
  }
}
