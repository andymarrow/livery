import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { StoredSource } from "@/lib/combine/merge";
import type { Frame } from "@/lib/extract/frames";
import type { Json, KitKind } from "@/lib/supabase/database.types";
import { getAdminClient } from "@/lib/supabase/admin";
import { toSlug } from "@/lib/url/normalise";
import { registrableDomain } from "@/lib/url/site";
import type { ReadyKit } from "./kits";

export type CaptureRow = { id: string; url: string; host: string; domain: string; viewport_width: number; viewport_height: number; data: Json; frame_path: string | null };

export async function saveCapture(input: { ownerId: string; url: string; host: string; domain: string; width: number; height: number; source: StoredSource; frame: Buffer | null }) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("page_captures")
    .insert({ owner_id: input.ownerId, url: input.url, host: input.host, domain: input.domain, viewport_width: input.width, viewport_height: input.height, data: input.source as unknown as Json })
    .select("id")
    .single();
  if (error) throw error;
  if (input.frame) {
    const path = `captures/${data.id}.webp`;
    const upload = await db.storage.from("screenshots").upload(path, input.frame, { contentType: "image/webp", upsert: false });
    if (!upload.error) await db.from("page_captures").update({ frame_path: path }).eq("id", data.id);
  }
  return data.id;
}

export async function loadCapture(id: string) {
  const { data, error } = await getAdminClient().from("page_captures").select("id, url, host, domain, viewport_width, viewport_height, data, frame_path").eq("id", id).single();
  if (error) throw error;
  return data as CaptureRow;
}

export async function captureFrame(row: CaptureRow, name: string): Promise<Frame | null> {
  if (!row.frame_path) return null;
  const { data } = await getAdminClient().storage.from("screenshots").download(row.frame_path);
  if (!data) return null;
  const webp = Buffer.from(await data.arrayBuffer());
  const { default: sharp } = await import("sharp");
  const meta = await sharp(webp).metadata();
  return { name, width: meta.width ?? row.viewport_width, height: meta.height ?? row.viewport_height, webp };
}

export type TargetKit = { id: string; slug: string; kind: KitKind; domain: string | null; source_url: string | null; owner_id: string | null; display_name: string | null };

export async function kitBySlug(slug: string): Promise<TargetKit | null> {
  const { data } = await getAdminClient().from("kits").select("id, slug, kind, domain, source_url, owner_id, display_name").eq("slug", slug).maybeSingle();
  return data;
}

export type SourceRef = { url: string; domain: string; versionId?: string; captureId?: string; slug: string; version: number; captured?: boolean };

/**
 * What a kit is made of in its newest version: its kit_sources rows (pages
 * and captures), or, for a page kit built straight from its URL, that one
 * version. `publicOnly` picks the newest public version (for copies).
 */
export async function currentSources(kit: TargetKit, publicOnly: boolean): Promise<SourceRef[]> {
  const db = getAdminClient();
  let query = db.from("kit_versions").select("id, version").eq("kit_id", kit.id).eq("status", "ready");
  if (publicOnly) query = query.eq("visibility", "public");
  const { data: latest } = await query.order("version", { ascending: false }).limit(1).maybeSingle();
  if (!latest?.version) return [];
  const { data: rows } = await db.from("kit_sources").select("position, source_url, domain, source_version_id, capture_id").eq("kit_version_id", latest.id).order("position");
  if (!rows?.length) {
    return kit.source_url && kit.domain ? [{ url: kit.source_url, domain: kit.domain, versionId: latest.id, slug: kit.slug, version: latest.version }] : [];
  }
  const versionIds = rows.flatMap((r) => (r.source_version_id ? [r.source_version_id] : []));
  const { data: versions } = versionIds.length ? await db.from("kit_versions").select("id, version, kits!inner(slug)").in("id", versionIds) : { data: [] };
  const meta = new Map((versions ?? []).map((v) => [v.id, { version: v.version ?? 0, slug: (v.kits as unknown as { slug: string }).slug }]));
  return rows.map((r) =>
    r.capture_id
      ? { url: r.source_url, domain: r.domain, captureId: r.capture_id, slug: kit.slug, version: latest.version!, captured: true }
      : { url: r.source_url, domain: r.domain, versionId: r.source_version_id!, slug: meta.get(r.source_version_id!)?.slug ?? kit.slug, version: meta.get(r.source_version_id!)?.version ?? 0 },
  );
}

/** A new private kit for this owner on this site ("linear.app: your pages"). */
export async function createOwnedKit(ownerId: string, host: string) {
  const db = getAdminClient();
  const domain = host.replace(/^www\./, "");
  await db.from("sites").upsert({ domain }, { onConflict: "domain", ignoreDuplicates: true });
  const suffix = randomBytes(3).toString("hex");
  const slug = `${toSlug(registrableDomain(domain) ?? domain, "/")}-mine-${suffix}`;
  const { data, error } = await db
    .from("kits")
    .insert({ kind: "site", domain, slug, owner_id: ownerId, sources_key: createHash("sha256").update(`owned:${ownerId}:${slug}`).digest("hex"), display_name: `${registrableDomain(domain) ?? domain}: your pages` })
    .select("id, slug, kind, domain, source_url, owner_id, display_name")
    .single();
  if (error) throw error;
  return data as TargetKit;
}

export async function startOwnerVersion(kitId: string, ownerId: string, sources: SourceRef[], sourcesHash: string, extractorVersion: number, flowVersion: number) {
  const { data, error } = await getAdminClient().rpc("start_owner_version", {
    p_kit_id: kitId,
    p_owner: ownerId,
    p_sources: sources.map((s, i) => ({ position: i + 1, source_url: s.url, domain: s.domain, source_version_id: s.versionId ?? null, capture_id: s.captureId ?? null })) as unknown as Json,
    p_sources_hash: sourcesHash,
    p_extractor_version: extractorVersion,
    p_flow_version: flowVersion,
  });
  if (error) throw error;
  return data[0];
}

export async function findReadyVersion(kitId: string, versionId: string): Promise<ReadyKit | null> {
  const { data: kit } = await getAdminClient().from("kits").select("slug").eq("id", kitId).single();
  const { data: v } = await getAdminClient().from("kit_versions").select("id, version, content_hash, published_at, grant_hash").eq("id", versionId).eq("status", "ready").maybeSingle();
  if (!kit || !v?.version || !v.content_hash || !v.published_at) return null;
  return { kitId, versionId: v.id, slug: kit.slug, version: v.version, contentHash: v.content_hash, publishedAt: v.published_at, grantHash: v.grant_hash };
}
