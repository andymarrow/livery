import "server-only";
import { missingMigration } from "@/lib/admin/audit";
import { errorText } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";

// Users, activity and the audit log for the admin area. Service role only;
// pages and actions check the admin session first.

export type ProAccount = { userId: string; email: string | null; source: "polar" | "admin"; status: string | null; interval: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean };

/** Everyone with Pro: paying through Polar or given it by the admin. */
export async function adminProAccounts(): Promise<ProAccount[] | null> {
  const db = getAdminClient();
  const { data, error } = await db.from("subscriptions").select("user_id, source, status, interval, current_period_end, cancel_at_period_end").eq("plan", "pro").order("updated_at", { ascending: false });
  if (error) return missingMigration(error) ? null : [];
  const users = await allAuthUsers();
  const email = new Map(users.map((u) => [u.id, u.email ?? null]));
  return (data ?? []).map((r) => ({ userId: r.user_id, email: email.get(r.user_id) ?? null, source: r.source, status: r.status, interval: r.interval, currentPeriodEnd: r.current_period_end, cancelAtPeriodEnd: r.cancel_at_period_end }));
}

export type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  providers: string[];
  createdAt: string;
  lastSignInAt: string | null;
  banned: boolean;
  confirmed: boolean;
  kits: { total: number; public: number; private: number };
  captures: number;
  connections: number;
  pro: boolean;
};

async function allAuthUsers() {
  const db = getAdminClient();
  const users = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

export async function adminUsers(): Promise<AdminUser[]> {
  const db = getAdminClient();
  const [users, profiles, kits, captures, tokens, pros] = await Promise.all([
    allAuthUsers(),
    db.from("profiles").select("id, display_name, avatar_url"),
    db.from("kits").select("owner_id, kit_versions(visibility, status)").not("owner_id", "is", null),
    db.from("page_captures").select("owner_id").not("owner_id", "is", null),
    db.from("extension_tokens").select("user_id, revoked_at, expires_at"),
    db.from("subscriptions").select("user_id").eq("plan", "pro"),
  ]);
  const proIds = new Set((pros.data ?? []).map((p) => p.user_id));
  const profile = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const now = Date.now();
  return users
    .map((u) => {
      const owned = (kits.data ?? []).filter((k) => k.owner_id === u.id) as unknown as { kit_versions: { visibility: string; status: string }[] }[];
      const isPublic = (k: (typeof owned)[number]) => k.kit_versions.some((v) => v.visibility === "public" && v.status === "ready");
      const p = profile.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        name: p?.display_name ?? (u.user_metadata?.full_name as string | undefined) ?? null,
        avatar: p?.avatar_url ?? null,
        providers: [...new Set((u.identities ?? []).map((i) => i.provider))],
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        banned: Boolean(u.banned_until && new Date(u.banned_until).getTime() > now),
        confirmed: Boolean(u.email_confirmed_at || u.confirmed_at),
        kits: { total: owned.length, public: owned.filter(isPublic).length, private: owned.filter((k) => !isPublic(k)).length },
        captures: (captures.data ?? []).filter((c) => c.owner_id === u.id).length,
        connections: (tokens.data ?? []).filter((t) => t.user_id === u.id && !t.revoked_at && new Date(t.expires_at).getTime() > now).length,
        pro: proIds.has(u.id),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type AdminUserDetail = AdminUser & {
  ownedKits: { id: string; slug: string; name: string; kind: string; hidden: boolean; versions: { version: number; visibility: string; status: string; publishedAt: string | null }[] }[];
  recentCaptures: { url: string; createdAt: string }[];
  tokens: { id: string; label: string; createdAt: string; lastUsedAt: string | null; revoked: boolean }[];
  saved: number;
};

export async function adminUser(id: string): Promise<AdminUserDetail | null> {
  const db = getAdminClient();
  const { data: auth } = await db.auth.admin.getUserById(id);
  if (!auth?.user) return null;
  const [summary] = (await adminUsers()).filter((u) => u.id === id);
  const [kits, captures, tokens, saved] = await Promise.all([
    db.from("kits").select("id, slug, kind, domain, display_name, curator, hidden, kit_versions(version, visibility, status, published_at)").eq("owner_id", id).order("created_at", { ascending: false }),
    db.from("page_captures").select("url, created_at").eq("owner_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("extension_tokens").select("id, label, created_at, last_used_at, revoked_at, expires_at").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("saved_kits").select("kit_id", { count: "exact", head: true }).eq("user_id", id),
  ]);
  return {
    ...summary,
    ownedKits: (kits.data ?? []).map((k) => ({
      id: k.id,
      slug: k.slug,
      name: k.display_name ?? (k.kind === "taste" ? `${k.curator ?? "Unnamed"}'s taste` : (k.domain ?? k.slug)),
      kind: k.kind,
      hidden: k.hidden,
      versions: ((k.kit_versions ?? []) as unknown as { version: number | null; visibility: string; status: string; published_at: string | null }[])
        .filter((v) => v.version)
        .map((v) => ({ version: v.version!, visibility: v.visibility, status: v.status, publishedAt: v.published_at }))
        .sort((a, b) => b.version - a.version),
    })),
    recentCaptures: (captures.data ?? []).map((c) => ({ url: c.url, createdAt: c.created_at })),
    tokens: (tokens.data ?? []).map((t) => ({ id: t.id, label: t.label, createdAt: t.created_at, lastUsedAt: t.last_used_at, revoked: Boolean(t.revoked_at) || new Date(t.expires_at).getTime() < Date.now() })),
    saved: saved.count ?? 0,
  };
}

export type ActivityItem = { at: string; kind: "signup" | "publish" | "private" | "capture" | "takedown" | "failed"; title: string; detail: string; href: string | null; userId: string | null };

/** What happened recently across the platform, newest first. */
export async function adminActivity(limit = 60): Promise<ActivityItem[]> {
  const db = getAdminClient();
  const week = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const [users, versions, captures, takedowns, failed] = await Promise.all([
    allAuthUsers(),
    db.from("kit_versions").select("version, visibility, published_at, kits!inner(slug, kind, domain, display_name, curator, owner_id)").eq("status", "ready").gte("published_at", week).order("published_at", { ascending: false }).limit(limit),
    db.from("page_captures").select("url, created_at, owner_id").gte("created_at", week).order("created_at", { ascending: false }).limit(limit),
    db.from("takedown_requests").select("domain, created_at, status").gte("created_at", week).order("created_at", { ascending: false }).limit(20),
    db.from("kit_versions").select("error, build_started_at, kits!inner(slug)").eq("status", "failed").gte("build_started_at", week).order("build_started_at", { ascending: false }).limit(20),
  ]);
  const email = new Map(users.map((u) => [u.id, u.email ?? u.id.slice(0, 8)]));
  const items: ActivityItem[] = [
    ...users.filter((u) => u.created_at >= week).map((u) => ({ at: u.created_at, kind: "signup" as const, title: "New account", detail: `${u.email ?? "no email"} · ${[...new Set((u.identities ?? []).map((i) => i.provider))].join(", ") || "email"}`, href: `/admin/users/${u.id}`, userId: u.id })),
    ...(versions.data ?? []).map((v) => {
      const k = v.kits as unknown as { slug: string; kind: string; domain: string | null; display_name: string | null; curator: string | null; owner_id: string | null };
      const name = k.display_name ?? (k.kind === "taste" ? `${k.curator ?? "Unnamed"}'s taste` : (k.domain ?? k.slug));
      const by = k.owner_id ? email.get(k.owner_id) ?? "a user" : "a visitor";
      return { at: v.published_at!, kind: v.visibility === "private" ? ("private" as const) : ("publish" as const), title: `${name} v${v.version}`, detail: `${v.visibility === "private" ? "Private version" : "Published"} by ${by}`, href: `/k/${k.slug}/v${v.version}`, userId: k.owner_id };
    }),
    ...(captures.data ?? []).map((c) => ({ at: c.created_at, kind: "capture" as const, title: new URL(c.url).hostname + new URL(c.url).pathname, detail: `Measured with the extension by ${c.owner_id ? email.get(c.owner_id) ?? "a user" : "a deleted user"}`, href: c.owner_id ? `/admin/users/${c.owner_id}` : null, userId: c.owner_id })),
    ...(takedowns.data ?? []).map((t) => ({ at: t.created_at, kind: "takedown" as const, title: `Takedown: ${t.domain}`, detail: t.status === "open" ? "Waiting for a decision" : `Resolved (${t.status})`, href: "/admin/takedowns", userId: null })),
    ...(failed.data ?? []).map((f) => ({ at: f.build_started_at, kind: "failed" as const, title: `Build failed: ${(f.kits as unknown as { slug: string }).slug}`, detail: (f.error ?? "no error recorded").slice(0, 120), href: "/admin/builds", userId: null })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export type AuditEntry = { id: number; at: string; action: string; target: string | null; detail: Record<string, unknown> };

/** The audit log, or null when its migration hasn't run yet. */
export async function adminAudit(limit = 100): Promise<AuditEntry[] | null> {
  const { data, error } = await getAdminClient().from("admin_audit").select("id, at, action, target, detail").order("at", { ascending: false }).limit(limit);
  if (error) {
    if (missingMigration(error)) return null;
    throw new Error(errorText(error));
  }
  return (data ?? []).map((d) => ({ ...d, detail: (d.detail ?? {}) as Record<string, unknown> }));
}

/** Deletes one kit and its files. Throws a readable message when a taste uses it or the migration is missing. */
export async function deleteKit(kitId: string) {
  const db = getAdminClient();
  const { data, error } = await db.rpc("admin_delete_kit", { p_kit_id: kitId });
  if (error) {
    if (missingMigration(error)) throw new Error("Run the admin_moderation migration in Supabase first (supabase/migrations/20261008200000_admin_moderation.sql).");
    const used = /kit is used by (.+)$/.exec(error.message);
    throw new Error(used ? `Other kits are built from it: ${used[1]}. Delete or rebuild those first.` : errorText(error));
  }
  const { kit_files, frame_folders, frame_files, cover } = data[0] ?? { kit_files: [], frame_folders: [], frame_files: [], cover: null };
  const screenshots = db.storage.from("screenshots");
  const inFolders = (await Promise.all(frame_folders.map(async (folder) => ((await screenshots.list(folder)).data ?? []).map((f) => `${folder}/${f.name}`)))).flat();
  await Promise.all([
    kit_files.length ? db.storage.from("kits").remove(kit_files) : null,
    inFolders.length || frame_files.length ? screenshots.remove([...inFolders, ...frame_files]) : null,
    cover ? db.storage.from("covers").remove([cover]) : null,
  ]);
  return { versions: frame_folders.length };
}
