import "server-only";
import { revalidatePath } from "next/cache";
import { kitPath } from "@/lib/kit/urls";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Withdraws published versions of a host's kits: the version row becomes
 * "withdrawn" (never edited, never deleted) and its files are removed, so
 * every link answers 410. `all` is an opt-out or takedown; otherwise only
 * versions built under a grant other than `keepHash` go. An opt-out or
 * takedown also reaches every combined kit (site or taste) that used one of
 * the host's pages.
 */
export async function withdrawVersions(domain: string, { all, keepHash = null }: { all: boolean; keepHash?: string | null }) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("kit_versions")
    .select("id, version, grant_hash, kits!inner(domain, slug)")
    .eq("status", "ready")
    .eq("kits.domain", domain);
  if (error) throw error;

  const targets: { id: string; version: number | null; kits: unknown }[] = (data ?? []).filter((v) => all || (v.grant_hash !== null && v.grant_hash !== keepHash));
  if (all) {
    const { data: used, error: usedError } = await db.from("kit_sources").select("kit_version_id").eq("domain", domain);
    if (usedError) throw usedError;
    const ids = [...new Set((used ?? []).map((u) => u.kit_version_id))].filter((id) => !targets.some((t) => t.id === id));
    if (ids.length) {
      const { data: combined, error: combinedError } = await db.from("kit_versions").select("id, version, kits!inner(slug)").eq("status", "ready").in("id", ids);
      if (combinedError) throw combinedError;
      targets.push(...(combined ?? []));
    }
  }
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
    const { data: frames } = await db.storage.from("screenshots").list(version.id);
    const frameNames = frames?.length ? frames.map((f) => f.name) : ["desktop.webp", "tablet.webp", "mobile.webp"];
    await db.storage.from("screenshots").remove(frameNames.map((n) => `${version.id}/${n}`));
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

/** Withdraws one published version (admin). Same file clean-up as above. */
export async function withdrawVersion(versionId: string) {
  const db = getAdminClient();
  const { data: version, error } = await db.from("kit_versions").select("id, version, kits!inner(slug)").eq("id", versionId).eq("status", "ready").single();
  if (error) throw error;
  const { data: paths, error: withdrawError } = await db.rpc("withdraw_version", { p_kit_version_id: versionId });
  if (withdrawError) throw withdrawError;
  const artefacts = paths?.[0] ?? { zip_path: null, tar_path: null };
  const files = [artefacts.zip_path, artefacts.tar_path].filter((p): p is string => Boolean(p));
  if (artefacts.tar_path) files.push(artefacts.tar_path.replace(/kit\.tar\.gz$/, "manifest.json"));
  if (files.length) await db.storage.from("kits").remove(files);
  const { data: frames } = await db.storage.from("screenshots").list(versionId);
  if (frames?.length) await db.storage.from("screenshots").remove(frames.map((f) => `${versionId}/${f.name}`));
  const kit = version.kits as unknown as { slug: string };
  try {
    if (version.version) revalidatePath(kitPath(kit.slug, version.version));
    revalidatePath("/explore");
  } catch {
    // Outside a request: nothing cached to clear.
  }
}
