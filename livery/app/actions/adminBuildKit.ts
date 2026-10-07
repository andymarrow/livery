"use server";

import { revalidatePath } from "next/cache";
import { resolveKit } from "@/controllers/buildKit";
import { requireAdmin } from "@/lib/adminSession";
import { failureCopy } from "@/lib/kit/failure";
import { kitPath } from "@/lib/kit/urls";
import { logger } from "@/lib/logger";

export type AdminBuildResult = { ok: true; path: string; cached: boolean } | { ok: false; error: string };

/** Builds a page kit from the admin, outside the visitor rate limit. `force` publishes a new version even when one is cached. */
export async function adminBuildKit(url: string, force = false): Promise<AdminBuildResult> {
  await requireAdmin();
  try {
    const outcome = await resolveKit(url, { ip: "admin", force, skipRate: true });
    if (outcome.status === "ready") {
      revalidatePath("/", "layout");
      return { ok: true, path: kitPath(outcome.kit.slug, outcome.kit.version), cached: outcome.cached };
    }
    if (outcome.status === "building") return { ok: false, error: "A build of this page is already running. Try again in a minute." };
    if (outcome.status === "failed") return { ok: false, error: failureCopy(outcome.failure.reason, url).body };
    return { ok: false, error: "Rate limited." };
  } catch (error) {
    logger.error("admin.build_failed", { url, error: error instanceof Error ? error.message : String(error) });
    return { ok: false, error: error instanceof Error ? error.message : "Build failed." };
  }
}
