"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminSession";
import { getAdminClient } from "@/lib/supabase/admin";

const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  "image/webp": { ext: "webp", magic: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
};
const MAX_BYTES = 2 * 1024 * 1024;

export type CoverResult = { ok: true } | { ok: false; error: string };

/** Uploads a cover image shown on the kit's cards instead of its layout frame. */
export async function adminSetCover(form: FormData): Promise<CoverResult> {
  await requireAdmin();
  const kitId = String(form.get("kitId") ?? "");
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose an image." };
  const type = TYPES[file.type];
  if (!type) return { ok: false, error: "Use a PNG, JPEG or WebP image." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Keep it under 2 MB." };
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!type.magic(bytes)) return { ok: false, error: "That file isn't the image type it claims to be." };

  const db = getAdminClient();
  const { data: kit, error } = await db.from("kits").select("slug, cover_path").eq("id", kitId).single();
  if (error) return { ok: false, error: "Kit not found." };
  const path = `${kit.slug}/${randomUUID()}.${type.ext}`;
  const upload = await db.storage.from("covers").upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (upload.error) return { ok: false, error: upload.error.message };
  const { error: saveError } = await db.from("kits").update({ cover_path: path }).eq("id", kitId);
  if (saveError) return { ok: false, error: saveError.message };
  if (kit.cover_path) await db.storage.from("covers").remove([kit.cover_path]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminRemoveCover(kitId: string) {
  await requireAdmin();
  const db = getAdminClient();
  const { data: kit } = await db.from("kits").select("cover_path").eq("id", kitId).single();
  await db.from("kits").update({ cover_path: null }).eq("id", kitId);
  if (kit?.cover_path) await db.storage.from("covers").remove([kit.cover_path]);
  revalidatePath("/", "layout");
}
