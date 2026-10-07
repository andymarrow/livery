"use client";

import { adminBuildKit } from "@/app/actions/adminBuildKit";
import { adminCombineKits } from "@/app/actions/adminCombineKits";
import type { AdminKit } from "@/services/admin";

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

export type RefreshResult = { ok: true; path: string; cached?: boolean } | { ok: false; error: string };

/** Rebuilds a taste or multi-page kit from the newest version of each of its sites. Nothing is rendered again; seconds, not minutes. */
export async function recombine(kit: AdminKit): Promise<RefreshResult> {
  return adminCombineKits({ kind: kit.kind as "site" | "taste", urls: kit.sources.map((s) => s.url), curator: kit.curator, kitId: kit.id });
}

/**
 * Brings a kit up to date and publishes a new version (older versions keep
 * working). A page kit renders its site again. A taste or multi-page kit is
 * rebuilt from its sites' newest versions; with `deep`, each site is
 * re-rendered first (one request each, so none hits the time limit).
 */
export async function refreshKit(kit: AdminKit, onStep: (step: string) => void, { deep = false } = {}): Promise<RefreshResult> {
  if (kit.kind === "page") {
    onStep("Rendering the site again");
    const result = await adminBuildKit(kit.sourceUrl!, true);
    return result.ok ? { ok: true, path: result.path } : result;
  }
  if (deep) {
    const urls = kit.sources.map((s) => s.url);
    for (const [i, url] of urls.entries()) {
      onStep(`Re-analysing ${i + 1} of ${urls.length}: ${kit.kind === "site" ? new URL(url).pathname : hostOf(url)}`);
      const result = await adminBuildKit(url, true);
      if (!result.ok) return { ok: false, error: `${hostOf(url)}: ${result.error}` };
    }
  }
  onStep("Combining the newest version of each site");
  return recombine(kit);
}
