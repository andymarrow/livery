import "server-only";
import type { Analysis } from "@/lib/generate/analysis";
import type { Manifest } from "@/lib/generate/package";
import { untarGz } from "@/lib/generate/untar";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";
import type { KitItemKind, KitLicence, KitStatus } from "@/lib/supabase/database.types";
import type { Tokens } from "@/lib/extract/process/tokens";

export type KitVersionView = {
  kitId: string;
  versionId: string;
  slug: string;
  sourceUrl: string;
  domain: string;
  version: number;
  status: KitStatus;
  levels: number[];
  skillMd: string;
  tarPath: string | null;
  zipPath: string | null;
  manifest: Manifest | null;
  contentHash: string;
  publishedAt: string;
  withdrawnAt: string | null;
  tokens: Tokens | null;
  analysis: Analysis | null;
  items: { kind: KitItemKind; name: string; licence: KitLicence; licence_name: string | null; alternative: string | null }[];
  latestVersion: number;
  /** Built under the site owner's livery.json grant. */
  ownerApproved: boolean;
};

/** A published or withdrawn version. Building and failed builds are never visible. */
export async function getKitVersion(slug: string, version: number): Promise<KitVersionView | null> {
  const db = getAdminClient();
  const { data: kit } = await db.from("kits").select("id, slug, source_url, domain").eq("slug", slug).maybeSingle();
  if (!kit) return null;
  const { data: v } = await db
    .from("kit_versions")
    .select("id, version, status, levels, skill_md, tar_path, zip_path, manifest, content_hash, published_at, withdrawn_at, data, grant_hash")
    .eq("kit_id", kit.id)
    .eq("version", version)
    .in("status", ["ready", "withdrawn"])
    .maybeSingle();
  if (!v || !v.version || !v.published_at || !v.content_hash) return null;
  const [{ data: items }, latest] = await Promise.all([
    db.from("kit_items").select("kind, name, licence, licence_name, alternative").eq("kit_version_id", v.id).order("id"),
    latestVersion(kit.id),
  ]);
  const data = (v.data ?? {}) as { extraction?: { tokens?: Tokens }; analysis?: Analysis };
  return {
    kitId: kit.id,
    versionId: v.id,
    slug: kit.slug,
    sourceUrl: kit.source_url,
    domain: kit.domain,
    version: v.version,
    status: v.status,
    levels: v.levels,
    skillMd: v.skill_md ?? "",
    tarPath: v.tar_path,
    zipPath: v.zip_path,
    manifest: (v.manifest as unknown as Manifest) ?? null,
    contentHash: v.content_hash,
    publishedAt: v.published_at,
    withdrawnAt: v.withdrawn_at,
    tokens: data.extraction?.tokens ?? null,
    analysis: data.analysis ?? null,
    items: items ?? [],
    latestVersion: latest ?? v.version,
    ownerApproved: v.grant_hash !== null,
  };
}

async function latestVersion(kitId: string) {
  const { data } = await getAdminClient()
    .from("kit_versions")
    .select("version")
    .eq("kit_id", kitId)
    .eq("status", "ready")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.version ?? null;
}

export async function latestVersionBySlug(slug: string) {
  const { data: kit } = await getAdminClient().from("kits").select("id").eq("slug", slug).maybeSingle();
  return kit ? latestVersion(kit.id) : null;
}

export async function downloadArtefact(path: string) {
  const { data, error } = await getAdminClient().storage.from("kits").download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

/** The kit's text files (frames excluded), read from its published archive. */
export async function readKitFiles(tarPath: string) {
  const archive = await downloadArtefact(tarPath);
  if (!archive) return [];
  return untarGz(archive)
    .filter((f) => !f.path.startsWith("frames/"))
    .map((f) => ({ path: f.path, text: f.content.toString("utf8") }));
}

/** Short-lived signed URLs for the content-removed preview frames. */
export async function frameUrls(versionId: string) {
  const names = ["desktop", "mobile"] as const;
  const { data } = await getAdminClient()
    .storage.from("screenshots")
    .createSignedUrls(names.map((n) => `${versionId}/${n}.webp`), 60 * 60 * 2);
  return names.map((name, i) => ({ name, url: data?.[i]?.signedUrl ?? null }));
}

export type KitCard = {
  slug: string;
  domain: string;
  sourceUrl: string;
  version: number;
  publishedAt: string;
  swatches: string[];
  accent: string | null;
  scheme: "light" | "dark" | null;
  font: string | null;
  iconSet: string | null;
  ownerApproved: boolean;
};

/** Newest published kits for the library, newest version per kit. */
export async function listKits({ query, limit = 24, offset = 0 }: { query?: string; limit?: number; offset?: number } = {}) {
  // Anon client: RLS already limits it to published versions.
  const db = getPublicClient();
  let request = db
    .from("kit_versions")
    .select("version, published_at, data, grant_hash, kits!inner(slug, domain, source_url)", { count: "exact" })
    .eq("status", "ready")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (query) request = request.ilike("kits.domain", `%${query.replace(/[%_]/g, "")}%`);
  const { data, count, error } = await request;
  if (error) throw error;

  const seen = new Set<string>();
  const cards: KitCard[] = [];
  for (const row of (data ?? []) as unknown as { version: number; published_at: string; grant_hash: string | null; data: { extraction?: { tokens?: Tokens; fonts?: { family: string }[]; icons?: { library?: { name: string } | null } } }; kits: { slug: string; domain: string; source_url: string } }[]) {
    if (seen.has(row.kits.slug)) continue;
    seen.add(row.kits.slug);
    const tokens = row.data?.extraction?.tokens;
    const palette = tokens?.palette;
    cards.push({
      slug: row.kits.slug,
      domain: row.kits.domain,
      sourceUrl: row.kits.source_url,
      version: row.version,
      publishedAt: row.published_at,
      swatches: palette ? [palette.background, palette.surface, palette.text, palette.accent, palette.border].filter((c): c is string => Boolean(c)) : [],
      accent: palette?.accent ?? null,
      scheme: palette?.scheme ?? null,
      font: tokens?.typography.families.display ?? row.data?.extraction?.fonts?.[0]?.family ?? null,
      iconSet: row.data?.extraction?.icons?.library?.name ?? null,
      ownerApproved: row.grant_hash !== null,
    });
  }
  return { cards, total: count ?? cards.length };
}
