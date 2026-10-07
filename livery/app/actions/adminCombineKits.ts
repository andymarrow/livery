"use server";

import { revalidatePath } from "next/cache";
import { combineKit } from "@/controllers/combineKit";
import { requireAdmin } from "@/lib/adminSession";
import { kitPath } from "@/lib/kit/urls";
import { logger } from "@/lib/logger";

export type AdminCombineResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * Makes a taste (or multi-page kit) from published page kits, or, with
 * `kitId`, publishes the next version of an existing one with new sources.
 */
export async function adminCombineKits(input: { kind: "site" | "taste"; urls: string[]; curator?: string | null; kitId?: string }): Promise<AdminCombineResult> {
  await requireAdmin();
  try {
    const outcome = await combineKit({ kind: input.kind, urls: input.urls, curator: input.curator ?? null }, { ip: "admin", skipRate: true, kitId: input.kitId });
    switch (outcome.status) {
      case "ready":
        revalidatePath("/", "layout");
        return { ok: true, path: kitPath(outcome.kit.slug, outcome.kit.version) };
      case "invalid":
        return { ok: false, error: outcome.message };
      case "needs_sources":
        return { ok: false, error: `Build these first: ${outcome.urls.join(", ")}` };
      case "failed":
        return { ok: false, error: `${outcome.url}: ${outcome.failure.detail ?? outcome.failure.reason}` };
      case "building":
        return { ok: false, error: "This combination is already being built." };
      default:
        return { ok: false, error: "Rate limited." };
    }
  } catch (error) {
    logger.error("admin.combine_failed", { error: error instanceof Error ? error.message : String(error) });
    return { ok: false, error: error instanceof Error ? error.message : "Combining failed." };
  }
}
