import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
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
