import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { coverUrl } from "@/services/kitRead";
import type { KitKind, KitStatus, ReadFailureReason, SiteOptIn } from "@/lib/supabase/database.types";

// Everything the admin page reads. Service role only; the page itself checks
// the admin session before calling any of these.

const DAY = 24 * 60 * 60 * 1000;

type CountQuery = { eq: (column: string, value: string) => CountQuery; gte: (column: string, value: string) => CountQuery } & PromiseLike<{ count: number | null }>;

async function count(table: "kits" | "kit_versions" | "takedown_requests" | "sites" | "read_failures", filter: (q: CountQuery) => CountQuery = (q) => q) {
  const { count: n } = await filter(getAdminClient().from(table).select("*", { count: "exact", head: true }) as unknown as CountQuery);
  return n ?? 0;
}

export async function adminOverview() {
  const since = new Date(Date.now() - DAY).toISOString();
  const week = new Date(Date.now() - 7 * DAY).toISOString();
  const [pages, sites, tastes, ready, withdrawn, building, failedToday, takedowns, granted, forbidden, failures, recent] = await Promise.all([
    count("kits", (q) => q.eq("kind", "page")),
    count("kits", (q) => q.eq("kind", "site")),
    count("kits", (q) => q.eq("kind", "taste")),
    count("kit_versions", (q) => q.eq("status", "ready")),
    count("kit_versions", (q) => q.eq("status", "withdrawn")),
    count("kit_versions", (q) => q.eq("status", "building")),
    count("kit_versions", (q) => q.eq("status", "failed").gte("build_started_at", since)),
    count("takedown_requests", (q) => q.eq("status", "open")),
    count("sites", (q) => q.eq("opt_in", "granted")),
    count("sites", (q) => q.eq("opt_in", "forbidden")),
    count("read_failures", (q) => q.gte("retry_after", new Date().toISOString())),
    getAdminClient().from("kit_versions").select("build_started_at, status").gte("build_started_at", week),
  ]);
  // Builds per day for the last seven days, oldest first.
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(Date.now() - (6 - i) * DAY);
    start.setUTCHours(0, 0, 0, 0);
    return { day: start.toISOString().slice(0, 10), ready: 0, failed: 0 };
  });
  for (const row of recent.data ?? []) {
    const day = days.find((d) => d.day === row.build_started_at.slice(0, 10));
    if (!day) continue;
    if (row.status === "failed") day.failed++;
    else day.ready++;
  }
  return { kits: { pages, sites, tastes }, versions: { ready, withdrawn, building, failedToday }, takedowns, owners: { granted, forbidden }, failures, days };
}

export type AdminKitRow = { versionId: string; slug: string; kind: KitKind; name: string; version: number; status: KitStatus; publishedAt: string };

export async function adminKits(query = ""): Promise<AdminKitRow[]> {
  let request = getAdminClient()
    .from("kit_versions")
    .select("id, version, status, published_at, kits!inner(slug, kind, domain, curator)")
    .in("status", ["ready", "withdrawn"])
    .order("published_at", { ascending: false })
    .limit(100);
  const q = query.replace(/[%_,.()"\\]/g, " ").trim();
  if (q) request = request.or(`slug.ilike.%${q}%,domain.ilike.%${q}%,curator.ilike.%${q}%`, { referencedTable: "kits" });
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const kit = row.kits as unknown as { slug: string; kind: KitKind; domain: string | null; curator: string | null };
    return {
      versionId: row.id,
      slug: kit.slug,
      kind: kit.kind,
      name: kit.kind === "taste" ? (kit.curator ? `${kit.curator}'s taste` : "Unnamed taste") : (kit.domain ?? kit.slug),
      version: row.version ?? 0,
      status: row.status,
      publishedAt: row.published_at ?? "",
    };
  });
}

export async function adminTakedowns() {
  const { data, error } = await getAdminClient().from("takedown_requests").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export type AdminFailure = { source_url: string; domain: string; reason: ReadFailureReason; detail: string | null; hits: number; last_at: string; retry_after: string };

export async function adminFailures(): Promise<AdminFailure[]> {
  const { data, error } = await getAdminClient().from("read_failures").select("source_url, domain, reason, detail, hits, last_at, retry_after").order("last_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function adminFailedBuilds() {
  const { data, error } = await getAdminClient()
    .from("kit_versions")
    .select("id, error, build_started_at, kits!inner(slug)")
    .eq("status", "failed")
    .order("build_started_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, error: row.error, at: row.build_started_at, slug: (row.kits as unknown as { slug: string }).slug }));
}

export async function adminOwners(): Promise<{ domain: string; opt_in: SiteOptIn; grant_checked_at: string | null }[]> {
  const { data, error } = await getAdminClient().from("sites").select("domain, opt_in, grant_checked_at").neq("opt_in", "none").order("updated_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export type AdminKit = {
  id: string;
  slug: string;
  kind: KitKind;
  name: string;
  displayName: string | null;
  curator: string | null;
  sourceUrl: string | null;
  featured: boolean;
  hidden: boolean;
  cover: string | null;
  preview: string | null;
  versions: number;
  latest: { versionId: string; version: number; status: KitStatus; publishedAt: string; visibility: "public" | "private" } | null;
  /** Who owns it: null for kits built by visitors without an account. */
  owner: { id: string; email: string | null } | null;
  stats: { views: number; likes: number; downloads: number };
  sources: { url: string; slug: string; version: number }[];
  /** Combined kits: some of their sites have a newer version than the one they were built from. */
  stale: boolean;
};

/** Every kit with its newest published version, for the admin tables. */
export async function adminKitList(): Promise<AdminKit[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("kits")
    .select("id, slug, kind, domain, source_url, curator, display_name, featured, hidden, cover_path, created_at, owner_id, kit_versions(id, version, status, published_at, visibility, data), kit_stats(views, likes, downloads)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  type Version = { id: string; version: number | null; status: KitStatus; published_at: string | null; visibility: "public" | "private"; data: { sources?: AdminKit["sources"] } | null };
  const owners = new Set((data ?? []).map((k) => k.owner_id).filter((id): id is string => Boolean(id)));
  const emails = new Map<string, string | null>();
  await Promise.all([...owners].map(async (id) => emails.set(id, (await db.auth.admin.getUserById(id)).data.user?.email ?? null)));
  const kits = (data ?? []).map((k) => {
    const versions = ((k.kit_versions ?? []) as unknown as Version[]).filter((v) => v.version && (v.status === "ready" || v.status === "withdrawn"));
    const latest = versions.sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
    const fallback = k.kind === "taste" ? (k.curator ? `${k.curator}'s taste` : "Unnamed taste") : (k.domain ?? k.slug);
    return {
      id: k.id,
      slug: k.slug,
      kind: k.kind,
      name: k.display_name ?? fallback,
      displayName: k.display_name,
      curator: k.curator,
      sourceUrl: k.source_url,
      featured: k.featured,
      hidden: k.hidden,
      cover: k.cover_path ? coverUrl(k.cover_path) : null,
      preview: null as string | null,
      versions: versions.length,
      latest: latest ? { versionId: latest.id, version: latest.version!, status: latest.status, publishedAt: latest.published_at ?? "", visibility: latest.visibility } : null,
      owner: k.owner_id ? { id: k.owner_id, email: emails.get(k.owner_id) ?? null } : null,
      stats: (Array.isArray(k.kit_stats) ? k.kit_stats[0] : k.kit_stats) ?? { views: 0, likes: 0, downloads: 0 },
      sources: latest?.data?.sources ?? [],
      stale: false,
    };
  }).filter((k) => k.latest).map((k) => (k.kind === "page" && k.sources.length > 1 ? { ...k, kind: "site" as const } : k));
  const newest = new Map(kits.filter((k) => k.kind === "page" && k.latest?.status === "ready").map((k) => [k.slug, k.latest!.version]));
  for (const k of kits) if (k.kind !== "page") k.stale = k.sources.some((s) => (newest.get(s.slug) ?? 0) > s.version);
  const framed = kits.filter((k) => !k.cover && k.latest?.status === "ready");
  if (framed.length) {
    const { data: signed } = await db.storage.from("screenshots").createSignedUrls(framed.map((k) => `${k.latest!.versionId}/desktop.webp`), 60 * 60);
    framed.forEach((k, i) => (k.preview = signed?.[i] && !signed[i].error ? signed[i].signedUrl : null));
  }
  for (const k of kits) if (k.cover) k.preview = k.cover;
  return kits;
}
