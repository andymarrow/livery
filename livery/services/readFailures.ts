import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ReadFailure } from "@/lib/extract/types";

/** A still-valid remembered failure for this URL, so we don't hit the site again. */
export async function getActiveFailure(sourceUrl: string): Promise<ReadFailure | null> {
  const { data, error } = await getAdminClient()
    .from("read_failures")
    .select("reason, detail, retry_after")
    .eq("source_url", sourceUrl)
    .gt("retry_after", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const retryAfter = Math.max(1, Math.round((new Date(data.retry_after).getTime() - Date.now()) / 1000));
  return { ok: false, reason: data.reason, detail: data.detail ?? undefined, retryAfter };
}

export async function rememberFailure(sourceUrl: string, domain: string, failure: ReadFailure) {
  const seconds = failure.retryAfter ?? 3600;
  const { error } = await getAdminClient().rpc("record_read_failure", {
    p_source_url: sourceUrl,
    p_domain: domain,
    p_reason: failure.reason,
    p_detail: failure.detail ?? null,
    p_retry_after: new Date(Date.now() + seconds * 1000).toISOString(),
  });
  if (error) throw error;
}
