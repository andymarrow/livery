import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { KitKind, KitStatus } from "@/lib/supabase/database.types";
import { coverUrl, kitTitle, type KitSourceLink } from "./kitRead";

export type OwnedKit = {
  slug: string;
  kind: KitKind;
  title: string;
  version: number;
  visibility: "public" | "private";
  status: KitStatus;
  publishedAt: string;
  versions: number;
  preview: string | null;
};

/** Every kit this person owns, with its newest version (private ones included). */
export async function ownedKits(userId: string): Promise<OwnedKit[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("kits")
    .select("slug, kind, domain, curator, display_name, cover_path, kit_versions(id, version, status, visibility, published_at, data)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  type Version = { id: string; version: number | null; status: KitStatus; visibility: "public" | "private"; published_at: string | null; data: { sources?: KitSourceLink[] } | null };
  const kits = (data ?? []).flatMap((k) => {
    const versions = ((k.kit_versions ?? []) as unknown as Version[]).filter((v) => v.version && (v.status === "ready" || v.status === "withdrawn")).sort((a, b) => b.version! - a.version!);
    const latest = versions[0];
    if (!latest) return [];
    return [{ k, latest, count: versions.length }];
  });
  const needFrames = kits.filter(({ k }) => !k.cover_path);
  const { data: signed } = needFrames.length ? await db.storage.from("screenshots").createSignedUrls(needFrames.map(({ latest }) => `${latest.id}/desktop.webp`), 3600) : { data: [] };
  const frames = new Map(needFrames.map(({ latest }, i) => [latest.id, signed?.[i] && !signed[i].error ? signed[i].signedUrl : null]));
  return kits.map(({ k, latest, count }) => ({
    slug: k.slug,
    kind: k.kind,
    title: kitTitle(k, latest.data?.sources ?? []),
    version: latest.version!,
    visibility: latest.visibility,
    status: latest.status,
    publishedAt: latest.published_at ?? "",
    versions: count,
    preview: k.cover_path ? coverUrl(k.cover_path) : (frames.get(latest.id) ?? null),
  }));
}
