import "server-only";
import type { StoredSource } from "@/lib/combine/merge";
import type { Frame } from "@/lib/extract/frames";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ReadyKit } from "./kits";

/** Newest published version of a combined kit, built from exactly these source versions. */
export async function findReadyCombined(sourcesKey: string, extractorVersion: number, sourcesHash: string): Promise<ReadyKit | null> {
  const db = getAdminClient();
  const { data: kit, error } = await db.from("kits").select("id, slug").eq("sources_key", sourcesKey).maybeSingle();
  if (error) throw error;
  if (!kit) return null;
  const { data: version, error: versionError } = await db
    .from("kit_versions")
    .select("id, version, content_hash, published_at, grant_hash")
    .eq("kit_id", kit.id)
    .eq("status", "ready")
    .eq("extractor_version", extractorVersion)
    .eq("sources_hash", sourcesHash)
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

export type CombinedSourceRow = { position: number; source_url: string; domain: string; source_version_id: string };

export async function startCombinedBuild(input: {
  kind: "site" | "taste";
  sourcesKey: string;
  domain: string | null;
  slug: string;
  curator: string | null;
  curatorSlug: string | null;
  sources: CombinedSourceRow[];
  sourcesHash: string;
  extractorVersion: number;
  flowVersion: number;
}) {
  const { data, error } = await getAdminClient().rpc("start_combined_build", {
    p_kind: input.kind,
    p_sources_key: input.sourcesKey,
    p_domain: input.domain,
    p_slug: input.slug,
    p_curator: input.curator,
    p_curator_slug: input.curatorSlug,
    p_sources: input.sources as unknown as Json,
    p_sources_hash: input.sourcesHash,
    p_extractor_version: input.extractorVersion,
    p_flow_version: input.flowVersion,
  });
  if (error) throw error;
  return data[0];
}

type StoredData = { extraction?: StoredSource & { frames?: { name: string; width: number; height: number }[] } };

/** A published page version's stored measurements and frame sizes. */
export async function loadSource(versionId: string) {
  const { data, error } = await getAdminClient().from("kit_versions").select("data").eq("id", versionId).eq("status", "ready").single();
  if (error) throw error;
  const extraction = (data.data as StoredData | null)?.extraction;
  if (!extraction?.tokens) throw new Error(`source ${versionId} has no stored measurements`);
  const { frames = [], ...source } = extraction;
  return { source: source as StoredSource, frameSizes: frames };
}

/** Copies of a source's preview frames, renamed for the combined kit. Missing frames are skipped. */
export async function loadFrames(versionId: string, wanted: { from: string; as: string }[], sizes: { name: string; width: number; height: number }[]): Promise<Frame[]> {
  const bucket = getAdminClient().storage.from("screenshots");
  const frames: Frame[] = [];
  for (const { from, as } of wanted) {
    const size = sizes.find((s) => s.name === from);
    if (!size) continue;
    const { data } = await bucket.download(`${versionId}/${from}.webp`);
    if (!data) continue;
    frames.push({ name: as, width: size.width, height: size.height, webp: Buffer.from(await data.arrayBuffer()) });
  }
  return frames;
}

/** A combined kit, for admins publishing its next version. */
export async function getCombinedKit(kitId: string) {
  const { data, error } = await getAdminClient().from("kits").select("id, slug, kind, curator").eq("id", kitId).in("kind", ["site", "taste"]).single();
  if (error) throw error;
  return data;
}

export async function startCombinedVersion(input: { kitId: string; sourcesKey: string; sources: CombinedSourceRow[]; sourcesHash: string; extractorVersion: number; flowVersion: number }) {
  const { data, error } = await getAdminClient().rpc("start_combined_version", {
    p_kit_id: input.kitId,
    p_sources_key: input.sourcesKey,
    p_sources: input.sources as unknown as Json,
    p_sources_hash: input.sourcesHash,
    p_extractor_version: input.extractorVersion,
    p_flow_version: input.flowVersion,
  });
  if (error) throw error;
  return data[0];
}
