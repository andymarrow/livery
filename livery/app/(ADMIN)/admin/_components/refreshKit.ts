"use client";

import { adminBuildKit } from "@/app/actions/adminBuildKit";
import { adminCombineKits } from "@/app/actions/adminCombineKits";
import type { AdminKit } from "@/services/admin";

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

export type RefreshResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * Analyses a kit again from the live site and publishes a new version.
 * A page kit is rendered once more; a taste or multi-page kit re-renders
 * each of its sites (one request each, so none hits the time limit) and is
 * then recombined. Older versions keep working for anyone who installed them.
 */
export async function refreshKit(kit: AdminKit, onStep: (step: string) => void): Promise<RefreshResult> {
  if (kit.kind === "page") {
    onStep("Rendering the site again");
    const result = await adminBuildKit(kit.sourceUrl!, true);
    return result.ok ? { ok: true, path: result.path } : result;
  }
  const urls = kit.sources.map((s) => s.url);
  for (const [i, url] of urls.entries()) {
    onStep(`Re-analysing ${i + 1} of ${urls.length}: ${kit.kind === "site" ? new URL(url).pathname : hostOf(url)}`);
    const result = await adminBuildKit(url, true);
    if (!result.ok) return { ok: false, error: `${hostOf(url)}: ${result.error}` };
  }
  onStep("Combining the fresh measurements");
  return adminCombineKits({ kind: kit.kind as "site" | "taste", urls, curator: kit.curator, kitId: kit.id });
}
