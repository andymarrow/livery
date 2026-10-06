import "server-only";
import { EXTRACTOR_VERSION, FLOW_VERSION } from "@/constants/constants";
import { createExtractor, type Extraction } from "@/lib/extract";
import type { ReadFailure } from "@/lib/extract/types";
import { generateKit } from "@/lib/generate/kit";
import { packageKit } from "@/lib/generate/package";
import { geminiWriter, type DesignWriter } from "@/lib/generate/writer";
import { logger } from "@/lib/logger";
import { checkBuildRate } from "@/lib/rateLimit";
import type { Json } from "@/lib/supabase/database.types";
import { failBuild, findReadyKit, nextVersion, publishBuild, startBuild, uploadArtefacts, uploadFrames, type ReadyKit } from "@/services/kits";
import { renderSite, screenTarget } from "./readSite";

// Stored data: measurements only. Never the site's text, and frames live in storage.
function storedExtraction(extraction: Extraction) {
  return { source: extraction.source, tokens: extraction.tokens, fonts: extraction.fonts, icons: extraction.icons, components: extraction.components, imagery: extraction.imagery, items: extraction.items };
}

export type BuildOutcome =
  | { status: "ready"; kit: ReadyKit; cached: boolean }
  | { status: "building"; slug: string }
  | { status: "rate_limited"; resetAt: Date }
  | { status: "failed"; failure: ReadFailure; slug?: string };

/**
 * The whole pipeline for one URL: screen, serve from cache, rate limit, take
 * the build lock, render and extract, generate, guard, package, upload, publish.
 * Any failure after the lock releases it, so the next request can retry.
 */
export async function resolveKit(raw: string, options: { ip: string; writer?: DesignWriter }): Promise<BuildOutcome> {
  const screened = await screenTarget(raw);
  if (!screened.ok) return { status: "failed", failure: screened };
  const target = screened.value;

  const cached = await findReadyKit(target.sourceUrl, EXTRACTOR_VERSION);
  if (cached) return { status: "ready", kit: cached, cached: true };

  const rate = await checkBuildRate(options.ip);
  if (!rate.allowed) return { status: "rate_limited", resetAt: rate.resetAt };

  const lock = await startBuild(target, EXTRACTOR_VERSION, FLOW_VERSION);
  if (!lock.claimed) return { status: "building", slug: target.slug };

  const started = Date.now();
  try {
    const extractor = createExtractor(target.sourceUrl);
    const rendered = await renderSite(target, extractor.visit);
    if (!rendered.ok) {
      await failBuild(lock.kit_version_id, `${rendered.reason}: ${rendered.detail ?? ""}`);
      return { status: "failed", failure: rendered, slug: target.slug };
    }
    const extraction = extractor.finish(rendered.value.finalUrl.toString());

    const version = await nextVersion(lock.kit_id);
    const kit = await generateKit(extraction, options.writer ?? geminiWriter(), { slug: target.slug, version });
    const packaged = packageKit(kit.files, { skillName: kit.skillName, version, flowVersion: FLOW_VERSION });

    const paths = await uploadArtefacts(target.slug, version, packaged);
    await uploadFrames(lock.kit_version_id, extraction.frames);

    const published = await publishBuild({
      versionId: lock.kit_version_id,
      data: { extraction: storedExtraction(extraction), analysis: kit.analysis, notes: kit.notes } as unknown as Json,
      skillMd: kit.files.find((f) => f.path === "SKILL.md")!.content.toString("utf8"),
      paths,
      manifest: packaged.manifest,
      contentHash: packaged.contentHash,
      levels: kit.levels,
      items: extraction.items,
    });
    if (published !== version) throw new Error(`version mismatch: uploaded v${version}, published v${published}`);

    logger.info("kit.published", { slug: target.slug, version, ms: Date.now() - started, notes: kit.notes });
    const ready = await findReadyKit(target.sourceUrl, EXTRACTOR_VERSION);
    if (!ready) throw new Error("published kit not found");
    return { status: "ready", kit: ready, cached: false };
  } catch (error) {
    logger.error("kit.build_failed", { slug: target.slug, error: error instanceof Error ? error.message : String(error) });
    await failBuild(lock.kit_version_id, error instanceof Error ? error.message : String(error)).catch(() => {});
    throw error;
  }
}
