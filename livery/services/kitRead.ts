import "server-only";
import type { Analysis } from "@/lib/generate/analysis";
import type { Manifest } from "@/lib/generate/package";
import { untarGz } from "@/lib/generate/untar";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";
import type { KitItemKind, KitKind, KitLicence, KitStatus } from "@/lib/supabase/database.types";
import type { Tokens } from "@/lib/extract/process/tokens";

/** A link a combined kit was made from. */
export type KitSourceLink = { url: string; slug: string; version: number; /** Measured in the owner's browser (extension). */ captured?: boolean };

/** A source with its own measurements, so a combined kit's page can show each one in place. */
export type KitSourceView = KitSourceLink & { tokens: Tokens | null; font: string | null; iconSet: string | null };

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

/** How a kit is named on the site: its host, or whose taste it is. */
export function kitTitle(kit: { kind: KitKind; domain: string | null; curator: string | null; display_name?: string | null }, sources: KitSourceLink[] = []) {
  if (kit.display_name) return kit.display_name;
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
  /** Every published version, newest first (withdrawn ones excluded). Private ones only for their owner's view. */
  versions: { version: number; publishedAt: string; visibility: "public" | "private" }[];
  visibility: "public" | "private";
  /** Private versions: the secret that lets an agent install it. Never shown to anyone but the owner. */
  privateKey: string | null;
  ownerId: string | null;
  /** Built under the site owner's livery.json grant. */
  ownerApproved: boolean;
  frameSizes: Record<string, { width: number; height: number }>;
};

/** A published or withdrawn version. Building and failed builds are never visible. */
export async function getKitVersion(slug: string, version: number): Promise<KitVersionView | null> {
  const db = getAdminClient();
  const { data: kit } = await db.from("kits").select("id, slug, kind, source_url, domain, curator, curator_slug, display_name, owner_id").eq("slug", slug).maybeSingle();
  if (!kit) return null;
  const { data: v } = await db
    .from("kit_versions")
    .select("id, version, status, levels, skill_md, tar_path, zip_path, manifest, content_hash, published_at, withdrawn_at, data, grant_hash, visibility, private_key")
    .eq("kit_id", kit.id)
    .eq("version", version)
    .in("status", ["ready", "withdrawn"])
    .maybeSingle();
  if (!v || !v.version || !v.published_at || !v.content_hash) return null;
  const [{ data: items }, versions] = await Promise.all([
    db.from("kit_items").select("kind, name, licence, licence_name, alternative").eq("kit_version_id", v.id).order("id"),
    publishedVersions(kit.id),
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
    latestVersion: versions.find((x) => x.visibility === "public")?.version ?? v.version,
    versions,
    visibility: v.visibility,
    privateKey: v.private_key,
    ownerId: kit.owner_id,
    ownerApproved: v.grant_hash !== null,
    frameSizes: Object.fromEntries((data.extraction?.frames ?? []).map((f) => [f.name, { width: f.width, height: f.height }])),
  };
}

type SourceData = { extraction?: { tokens?: Tokens; fonts?: { family: string }[]; icons?: { library?: { name: string } | null } } };

async function sourceViews(versionId: string, links: KitSourceLink[]): Promise<KitSourceView[]> {
  if (!links.length) return [];
  const db = getAdminClient();
  const { data: rows } = await db.from("kit_sources").select("position, source_version_id, capture_id").eq("kit_version_id", versionId).order("position");
  const versionIds = (rows ?? []).flatMap((r) => (r.source_version_id ? [r.source_version_id] : []));
  const captureIds = (rows ?? []).flatMap((r) => (r.capture_id ? [r.capture_id] : []));
  const [{ data: versions }, { data: captures }] = await Promise.all([
    versionIds.length ? db.from("kit_versions").select("id, data").in("id", versionIds) : Promise.resolve({ data: [] as { id: string; data: unknown }[] }),
    captureIds.length ? db.from("page_captures").select("id, data").in("id", captureIds) : Promise.resolve({ data: [] as { id: string; data: unknown }[] }),
  ]);
  const byId = new Map([
    ...(versions ?? []).map((v) => [v.id, (v.data ?? {}) as SourceData] as const),
    // A capture stores its measurements directly (no "extraction" wrapper).
    ...(captures ?? []).map((c) => [c.id, { extraction: (c.data ?? {}) as SourceData["extraction"] }] as const),
  ]);
  return links.map((link, index) => {
    const row = rows?.[index];
    const d = byId.get(row?.source_version_id ?? row?.capture_id ?? "")?.extraction;
    return {
      ...link,
      tokens: d?.tokens ?? null,
      font: d?.tokens?.typography.families.display ?? d?.fonts?.[0]?.family ?? null,
      iconSet: d?.icons?.library?.name ?? null,
    };
  });
}

async function publishedVersions(kitId: string) {
  const { data } = await getAdminClient()
    .from("kit_versions")
    .select("version, published_at, visibility")
    .eq("kit_id", kitId)
    .eq("status", "ready")
    .order("version", { ascending: false });
  return (data ?? []).filter((v) => v.version && v.published_at).map((v) => ({ version: v.version!, publishedAt: v.published_at!, visibility: v.visibility }));
}

/** The newest public version: what /k/<slug> opens for everyone. */
async function latestVersion(kitId: string) {
  const { data } = await getAdminClient()
    .from("kit_versions")
    .select("version")
    .eq("kit_id", kitId)
    .eq("status", "ready")
    .eq("visibility", "public")
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

/** One signed desktop frame per card, in a single storage request. A missing frame leaves the card's palette strip on its own. */
export function coverUrl(path: string) {
  return getAdminClient().storage.from("covers").getPublicUrl(path).data.publicUrl;
}

async function attachPreviews(all: KitCard[]) {
  const cards = all.filter((c) => !c.preview);
  if (!cards.length) return;
  try {
    const { data } = await getAdminClient()
      .storage.from("screenshots")
      .createSignedUrls(cards.map((c) => `${c.versionId}/desktop.webp`), 60 * 60 * 2);
    cards.forEach((card, i) => {
      card.preview = data?.[i] && !data[i].error ? data[i].signedUrl : null;
    });
  } catch {
    // Previews are decoration; the library still lists without them.
  }
}

/** Short-lived signed URLs for the content-removed preview frames. */
export async function frameUrls(versionId: string) {
  const names = ["desktop", "tablet", "mobile"] as const;
  const { data } = await getAdminClient()
    .storage.from("screenshots")
    .createSignedUrls(names.map((n) => `${versionId}/${n}.webp`), 60 * 60 * 2);
  return names.map((name, i) => ({ name, url: data?.[i]?.signedUrl ?? null }));
}

export type KitCard = {
  slug: string;
  kitId: string;
  versionId: string;
  kind: KitKind;
  title: string;
  /** "Homepage", "/pricing", "4 pages" or "3 sites". */
  detail: string;
  /** Page kits only: what a taste collects. */
  sourceUrl: string | null;
  /** The card's picture: an admin-chosen cover, else the content-removed desktop frame (signed). */
  preview: string | null;
  featured: boolean;
  /** Each counted once per person. */
  stats: { views: number; likes: number; downloads: number };
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
export type KitSort = "newest" | "liked" | "downloaded" | "viewed";
export const COLOUR_FAMILIES = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "neutral"] as const;
export type ColourFamily = (typeof COLOUR_FAMILIES)[number];
export type KitFilters = { scheme?: "light" | "dark"; colour?: ColourFamily; font?: string; icons?: string; approved?: boolean };

const SORT_COLUMN: Record<KitSort, "published_at" | "likes" | "downloads" | "views"> = { newest: "published_at", liked: "likes", downloaded: "downloads", viewed: "views" };

/** Newest published kits for the library, newest version per kit. */
export async function listKits({
  query,
  shelf = "all",
  curator,
  featuredOnly = false,
  sort = "newest",
  filters = {},
  kitIds,
  limit = 24,
  offset = 0,
}: { query?: string; shelf?: KitShelf; curator?: string; featuredOnly?: boolean; sort?: KitSort; filters?: KitFilters; kitIds?: string[]; limit?: number; offset?: number } = {}) {
  // Anon client: RLS already limits it to published versions. kit_library
  // has one row per kit (its newest version) with its totals.
  const db = getPublicClient();
  let request = db
    .from("kit_library")
    .select("id, kit_id, version, published_at, data, grant_hash, views, likes, downloads, kits!inner(slug, kind, domain, source_url, curator, curator_slug, display_name, featured, hidden, cover_path)", { count: "exact" })
    .order(SORT_COLUMN[sort], { ascending: false })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (query) {
    const q = query.replace(/[%_,.()"\\]/g, " ").trim();
    if (q) request = request.or(`domain.ilike.%${q}%,curator.ilike.%${q}%,display_name.ilike.%${q}%,slug.ilike.%${q}%`, { referencedTable: "kits" });
  }
  if (shelf === "sites") request = request.in("kits.kind", ["page", "site"]);
  if (shelf === "tastes") request = request.eq("kits.kind", "taste");
  if (curator) request = request.eq("kits.curator_slug", curator);
  if (featuredOnly) request = request.eq("kits.featured", true);
  if (kitIds) request = request.in("kit_id", kitIds.length ? kitIds : ["00000000-0000-0000-0000-000000000000"]);
  if (filters.scheme) request = request.eq("scheme", filters.scheme);
  if (filters.colour) request = request.eq("colour", filters.colour);
  if (filters.font) request = request.eq("font", filters.font);
  if (filters.icons) request = request.eq("icon_set", filters.icons);
  if (filters.approved) request = request.not("grant_hash", "is", null);
  request = request.eq("kits.hidden", false);
  const { data, count, error } = await request;
  if (error) throw error;

  const seen = new Set<string>();
  const cards: KitCard[] = [];
  type Row = {
    id: string;
    views: number;
    likes: number;
    downloads: number;
    version: number;
    published_at: string;
    grant_hash: string | null;
    data: { extraction?: { tokens?: Tokens; fonts?: { family: string }[]; icons?: { library?: { name: string } | null } }; sources?: KitSourceLink[] };
    kit_id: string;
    kits: { slug: string; kind: KitKind; domain: string | null; source_url: string | null; curator: string | null; curator_slug: string | null; display_name: string | null; featured: boolean; cover_path: string | null };
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
      preview: row.kits.cover_path ? coverUrl(row.kits.cover_path) : null,
      stats: { views: row.views, likes: row.likes, downloads: row.downloads },
      featured: row.kits.featured,
      kitId: row.kit_id,
      versionId: row.id,
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
  await attachPreviews(cards);
  return { cards, total: count ?? cards.length };
}

export type LibraryFacets = { fonts: { name: string; count: number }[]; icons: { name: string; count: number }[]; colours: Partial<Record<ColourFamily, number>>; schemes: { light: number; dark: number } };

/** What the library can be filtered by, with counts, so the filter bar only offers choices that exist. */
export async function libraryFacets(): Promise<LibraryFacets> {
  const { data, error } = await getPublicClient().from("kit_library").select("scheme, colour, font, icon_set, kits!inner(hidden)").eq("kits.hidden", false).limit(2000);
  if (error) throw error;
  const tally = (values: (string | null)[]) => {
    const counts = new Map<string, number>();
    for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
  };
  const rows = data ?? [];
  return {
    fonts: tally(rows.map((r) => r.font)),
    icons: tally(rows.map((r) => r.icon_set)),
    colours: Object.fromEntries(tally(rows.map((r) => r.colour)).map((c) => [c.name, c.count])) as LibraryFacets["colours"],
    schemes: { light: rows.filter((r) => r.scheme === "light").length, dark: rows.filter((r) => r.scheme === "dark").length },
  };
}
