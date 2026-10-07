import "server-only";
import type { Frame } from "@/lib/extract/frames";
import type { Manifest } from "@/lib/generate/package";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminClient } from "@/lib/supabase/admin";
import type { KitItem } from "@/lib/extract";

export type ReadyKit = { kitId: string; versionId: string; slug: string; version: number; contentHash: string; publishedAt: string; grantHash: string | null };

/** Newest published version of a URL built by the current extractor, if any. */
export async function findReadyKit(sourceUrl: string, extractorVersion: number): Promise<ReadyKit | null> {
  const db = getAdminClient();
  const { data: kit, error } = await db.from("kits").select("id, slug").eq("source_url", sourceUrl).maybeSingle();
  if (error) throw error;
  if (!kit) return null;
  const { data: version, error: versionError } = await db
    .from("kit_versions")
    .select("id, version, content_hash, published_at, grant_hash")
    .eq("kit_id", kit.id)
    .eq("status", "ready")
    .eq("extractor_version", extractorVersion)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (versionError) throw versionError;
  if (!version?.version || !version.content_hash || !version.published_at) return null;
  return {
    kitId: kit.id,
    versionId: version.id,
    slug: kit.slug,
    version: version.version,
    contentHash: version.content_hash,
    publishedAt: version.published_at,
    grantHash: version.grant_hash,
  };
}

/** Takes the build lock. A new kit belongs to `ownerId` (when signed in); an existing kit keeps its owner. */
export async function startBuild(target: { sourceUrl: string; domain: string; slug: string }, extractorVersion: number, flowVersion: number, ownerId: string | null = null) {
  const { data, error } = await getAdminClient().rpc("start_build", {
    p_source_url: target.sourceUrl,
    p_domain: target.domain,
    p_slug: target.slug,
    p_extractor_version: extractorVersion,
    p_flow_version: flowVersion,
    p_owner: ownerId,
  });
  if (error) throw error;
  return data[0];
}

export async function failBuild(versionId: string, message: string) {
  const { error } = await getAdminClient().rpc("fail_build", { p_kit_version_id: versionId, p_error: message });
  if (error) throw error;
}

/** The next version number. Safe because the build lock allows one builder per kit. */
export async function nextVersion(kitId: string) {
  const { data, error } = await getAdminClient()
    .from("kit_versions")
    .select("version")
    .eq("kit_id", kitId)
    .not("version", "is", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.version ?? 0) + 1;
}

export const artefactPaths = (slug: string, version: number) => ({
  zip: `${slug}/v${version}/kit.zip`,
  tar: `${slug}/v${version}/kit.tar.gz`,
  manifest: `${slug}/v${version}/manifest.json`,
});

/** Writes the archives once. upsert is off: an existing path is never overwritten. */
export async function uploadArtefacts(slug: string, version: number, artefacts: { zip: Buffer; tar: Buffer; manifest: Manifest }) {
  const bucket = getAdminClient().storage.from("kits");
  const paths = artefactPaths(slug, version);
  const uploads: [string, Buffer, string][] = [
    [paths.tar, artefacts.tar, "application/gzip"],
    [paths.zip, artefacts.zip, "application/zip"],
    [paths.manifest, Buffer.from(JSON.stringify(artefacts.manifest, null, 2)), "application/json"],
  ];
  await Promise.all(
    uploads.map(async ([path, body, contentType]) => {
      const { error } = await bucket.upload(path, body, { contentType, upsert: false, cacheControl: "31536000" });
      if (error) throw error;
    }),
  );
  return paths;
}

/** Content-removed frames for the preview page. Private bucket, served by signed URL. */
export async function uploadFrames(versionId: string, frames: Frame[]) {
  const bucket = getAdminClient().storage.from("screenshots");
  await Promise.all(
    frames.map(async (frame) => {
      const { error } = await bucket.upload(`${versionId}/${frame.name}.webp`, frame.webp, { contentType: "image/webp", upsert: false });
      if (error) throw error;
    }),
  );
}

export async function publishBuild(input: {
  versionId: string;
  data: Json;
  skillMd: string;
  paths: { zip: string; tar: string };
  manifest: Manifest;
  contentHash: string;
  levels: number[];
  items: KitItem[];
  grantSnapshot?: Json | null;
  grantHash?: string | null;
}) {
  const { data, error } = await getAdminClient().rpc("publish_build", {
    p_kit_version_id: input.versionId,
    p_data: input.data,
    p_skill_md: input.skillMd,
    p_zip_path: input.paths.zip,
    p_tar_path: input.paths.tar,
    p_manifest: input.manifest as unknown as Json,
    p_content_hash: input.contentHash,
    p_levels: input.levels,
    p_items: input.items as unknown as Json,
    p_grant_snapshot: input.grantSnapshot ?? null,
    p_grant_hash: input.grantHash ?? null,
  });
  if (error) throw error;
  return data;
}
