import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

/** True when the owner has opted out (or filed a takedown) for this host. */
export async function isForbiddenByOwner(domain: string) {
  const { data, error } = await getAdminClient().from("sites").select("opt_in").eq("domain", domain).maybeSingle();
  if (error) throw error;
  return data?.opt_in === "forbidden";
}
