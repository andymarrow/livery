import "server-only";
import type { Analysis } from "@/lib/generate/analysis";
import type { Manifest } from "@/lib/generate/package";
import { untarGz } from "@/lib/generate/untar";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";
import type { KitItemKind, KitKind, KitLicence, KitStatus } from "@/lib/supabase/database.types";
import type { Tokens } from "@/lib/extract/process/tokens";

/** A link a combined kit was made from. */
export type KitSourceLink = { url: string; slug: string; version: number };

/** A source with its own measurements, so a combined kit's page can show each one in place. */
export type KitSourceView = KitSourceLink & { tokens: Tokens | null; font: string | null; iconSet: string | null };

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

/** How a kit is named on the site: its host, or whose taste it is. */
export function kitTitle(kit: { kind: KitKind; domain: string | null; curator: string | null }, sources: KitSourceLink[] = []) {
  if (kit.kind !== "taste") return kit.domain ?? "Untitled kit";
  if (kit.curator) return `${kit.curator}'s taste`;
  const hosts = [...new Set(sources.map((s) => hostOf(s.url)))];
  return hosts.length ? `A taste across ${hosts.slice(0, 2).join(", ")}${hosts.length > 2 ? ` +${hosts.length - 2}` : ""}` : "A shared taste";
}

export type KitVersionView = {
  kitId: string;
  versionId: string;
  slug: string;
  kind: KitKind;
  /** Display name: the host, or "Andy's taste". */
  title: string;
  curator: string | null;
  curatorSlug: string | null;
  /** Combined kits: the page kits they were made from, in order, with their measurements. */
  sources: KitSourceView[];
  /** Page kits only. */
  sourceUrl: string | null;
  domain: string | null;
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
  frameSizes: Record<string, { width: number; height: number }>;
};

/** A published or withdrawn version. Building and failed builds are never visible. */
export async function getKitVersion(slug: string, version: number): Promise<KitVersionView | null> {
  const db = getAdminClient();
  const { data: kit } = await db.from("kits").select("id, slug, kind, source_url, domain, curator, curator_slug").eq("slug", slug).maybeSingle();
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
  const data = (v.data ?? {}) as { extraction?: { tokens?: Tokens; frames?: { name: string; width: number; height: number }[] }; analysis?: Analysis; sources?: KitSourceLink[] };
  const sources = await sourceViews(v.id, data.sources ?? []);
  return {
    kitId: kit.id,
    versionId: v.id,
    slug: kit.slug,
    kind: kit.kind,
    title: kitTitle(kit, sources),
    curator: kit.curator,
    curatorSlug: kit.curator_slug,
    sources,
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
    frameSizes: Object.fromEntries((data.extraction?.frames ?? []).map((f) => [f.name, { width: f.width, height: f.height }])),
  };
}

type SourceData = { extraction?: { tokens?: Tokens; fonts?: { family: string }[]; icons?: { library?: { name: string } | null } } };

async function sourceViews(versionId: string, links: KitSourceLink[]): Promise<KitSourceView[]> {
  if (!links.length) return [];
  const db = getAdminClient();
  const { data: rows } = await db.from("kit_sources").select("position, source_version_id").eq("kit_version_id", versionId).order("position");
  const ids = (rows ?? []).map((r) => r.source_version_id);
  const { data: versions } = ids.length ? await db.from("kit_versions").select("id, data").in("id", ids) : { data: [] };
  const byId = new Map((versions ?? []).map((v) => [v.id, (v.data ?? {}) as SourceData]));
  return links.map((link, index) => {
    const d = byId.get(rows?.[index]?.source_version_id ?? "")?.extraction;
    return {
      ...link,
      tokens: d?.tokens ?? null,
      font: d?.tokens?.typography.families.display ?? d?.fonts?.[0]?.family ?? null,
      iconSet: d?.icons?.library?.name ?? null,
    };
  });
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
  kind: KitKind;
  title: string;
  /** "Homepage", "/pricing", "4 pages" or "3 sites". */
  detail: string;
  /** Page kits only: what a taste collects. */
  sourceUrl: string | null;
  curator: string | null;
  curatorSlug: string | null;
  version: number;
  publishedAt: string;
  swatches: string[];
  accent: string | null;
  scheme: "light" | "dark" | null;
  font: string | null;
  iconSet: string | null;
  ownerApproved: boolean;
};

export type KitShelf = "all" | "sites" | "tastes";

/** Newest published kits for the library, newest version per kit. */
export async function listKits({
  query,
  shelf = "all",
  curator,
  limit = 24,
  offset = 0,
}: { query?: string; shelf?: KitShelf; curator?: string; limit?: number; offset?: number } = {}) {
  // Anon client: RLS already limits it to published versions.
  const db = getPublicClient();
  let request = db
    .from("kit_versions")
    .select("version, published_at, data, grant_hash, kits!inner(slug, kind, domain, source_url, curator, curator_slug)", { count: "exact" })
    .eq("status", "ready")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (query) {
    const q = query.replace(/[%_,.()"\\]/g, " ").trim();
    if (q) request = request.or(`domain.ilike.%${q}%,curator.ilike.%${q}%`, { referencedTable: "kits" });
  }
  if (shelf === "sites") request = request.in("kits.kind", ["page", "site"]);
  if (shelf === "tastes") request = request.eq("kits.kind", "taste");
  if (curator) request = request.eq("kits.curator_slug", curator);
  const { data, count, error } = await request;
  if (error) throw error;

  const seen = new Set<string>();
  const cards: KitCard[] = [];
  type Row = {
    version: number;
    published_at: string;
    grant_hash: string | null;
    data: { extraction?: { tokens?: Tokens; fonts?: { family: string }[]; icons?: { library?: { name: string } | null } }; sources?: KitSourceLink[] };
    kits: { slug: string; kind: KitKind; domain: string | null; source_url: string | null; curator: string | null; curator_slug: string | null };
  };
  for (const row of (data ?? []) as unknown as Row[]) {
    if (seen.has(row.kits.slug)) continue;
    seen.add(row.kits.slug);
    const tokens = row.data?.extraction?.tokens;
    const palette = tokens?.palette;
    const sources = row.data?.sources ?? [];
    const path = row.kits.source_url ? new URL(row.kits.source_url).pathname : "/";
    cards.push({
      slug: row.kits.slug,
      kind: row.kits.kind,
      title: kitTitle(row.kits, sources),
      detail: row.kits.kind === "page" ? (path === "/" ? "Homepage" : path) : row.kits.kind === "site" ? `${sources.length} pages` : `${new Set(sources.map((s) => hostOf(s.url))).size} sites`,
      sourceUrl: row.kits.source_url,
      curator: row.kits.curator,
      curatorSlug: row.kits.curator_slug,
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
