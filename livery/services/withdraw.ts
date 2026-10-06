import "server-only";
import { revalidatePath } from "next/cache";
import { kitPath } from "@/lib/kit/urls";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Withdraws published versions of a host's kits: the version row becomes
 * "withdrawn" (never edited, never deleted) and its files are removed, so
 * every link answers 410. `all` is an opt-out or takedown; otherwise only
 * versions built under a grant other than `keepHash` go.
 */
export async function withdrawVersions(domain: string, { all, keepHash = null }: { all: boolean; keepHash?: string | null }) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("kit_versions")
    .select("id, version, grant_hash, kits!inner(domain, slug)")
    .eq("status", "ready")
    .eq("kits.domain", domain);
  if (error) throw error;

  const targets = (data ?? []).filter((v) => all || (v.grant_hash !== null && v.grant_hash !== keepHash));
  for (const version of targets) {
    const { data: paths, error: withdrawError } = await db.rpc("withdraw_version", { p_kit_version_id: version.id });
    if (withdrawError) {
      logger.error("withdraw.failed", { domain, version: version.id, error: withdrawError.message });
      continue;
    }
    const artefacts = paths?.[0] ?? { zip_path: null, tar_path: null };
    const files = [artefacts.zip_path, artefacts.tar_path].filter((p): p is string => Boolean(p));
    if (artefacts.tar_path) files.push(artefacts.tar_path.replace(/kit\.tar\.gz$/, "manifest.json"));
    if (files.length) await db.storage.from("kits").remove(files);
    await db.storage.from("screenshots").remove(["desktop", "tablet", "mobile"].map((n) => `${version.id}/${n}.webp`));
    const kit = version.kits as unknown as { slug: string };
    if (version.version) {
      try {
        revalidatePath(kitPath(kit.slug, version.version));
        revalidatePath("/explore");
      } catch {
        // Outside a request (scripts, tests): nothing cached to clear.
      }
    }
  }
  if (targets.length) logger.info("withdraw.done", { domain, count: targets.length, all });
  return targets.length;
}
