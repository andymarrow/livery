import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { KitEvent } from "@/lib/stats";

export type KitStats = { views: number; likes: number; downloads: number };

export async function kitIdBySlug(slug: string) {
  const { data } = await getAdminClient().from("kits").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

export async function getStats(kitId: string): Promise<KitStats> {
  const { data } = await getAdminClient().from("kit_stats").select("views, likes, downloads").eq("kit_id", kitId).maybeSingle();
  return data ?? { views: 0, likes: 0, downloads: 0 };
}

/** True when it counted: the first time this person did this for this kit. */
export async function recordEvent(kitId: string, kind: KitEvent, visitor: string, network: string) {
  const { data, error } = await getAdminClient().rpc("record_kit_event", { p_kit_id: kitId, p_kind: kind, p_visitor: visitor, p_network: network });
  if (error) throw error;
  return data;
}

export async function removeLike(kitId: string, visitor: string, network: string) {
  const { error } = await getAdminClient().rpc("remove_like", { p_kit_id: kitId, p_visitor: visitor, p_network: network });
  if (error) throw error;
}

export async function hasLiked(kitId: string, visitor: string, network: string) {
  const { count } = await getAdminClient()
    .from("kit_events")
    .select("*", { count: "exact", head: true })
    .eq("kit_id", kitId)
    .eq("kind", "like")
    .or(`visitor.eq.${visitor},network.eq.${network}`);
  return (count ?? 0) > 0;
}
