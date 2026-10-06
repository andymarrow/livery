import "server-only";
import { EXTRACTOR_VERSION, FLOW_VERSION } from "@/constants/constants";
import { createExtractor, type Extraction, type KitItem } from "@/lib/extract";
import { buildAssetFiles } from "@/lib/extract/assets";
import type { AssetKind } from "@/lib/extract/collect/collectAssets";
import type { KitFile, OwnerTerms } from "@/lib/generate/kit";
import { DEFAULT_LEVELS, type Level } from "@/lib/generate/levels";
import { fetchOwnerRules } from "@/lib/optin/ownerRules";
import type { Progress, ReadFailure } from "@/lib/extract/types";
import { generateKit } from "@/lib/generate/kit";
import { packageKit } from "@/lib/generate/package";
import { geminiWriter, type DesignWriter } from "@/lib/generate/writer";
import { logger } from "@/lib/logger";
import { checkBuildRate } from "@/lib/rateLimit";
import type { Json } from "@/lib/supabase/database.types";
import { failBuild, findReadyKit, nextVersion, publishBuild, startBuild, uploadArtefacts, uploadFrames, type ReadyKit } from "@/services/kits";
import { renderSite, screenTarget, type ScreenedTarget } from "./readSite";

type GrantPlan = { levels: Level[]; assets: AssetKind[]; ownerRules: string | null; allowQuotes: boolean; terms: OwnerTerms | null; notes: string[] };

/** What the owner's grant (if any) adds to this build. Without one: levels 1-3, style only. */
async function grantPlan(target: ScreenedTarget): Promise<GrantPlan> {
  if (target.grant.status !== "granted") return { levels: DEFAULT_LEVELS, assets: [], ownerRules: null, allowQuotes: false, terms: null, notes: [] };
  const { grant } = target.grant;
  const notes: string[] = [];
  let levels = [...new Set(grant.allow.levels)].sort() as Level[];
  let ownerRules: string | null = null;
  if (levels.includes(4)) {
    ownerRules = await fetchOwnerRules(grant.rules);
    if (!ownerRules) {
      levels = levels.filter((l) => l !== 4);
      notes.push("level 4 skipped: the owner's rules document could not be read as Markdown or text");
    }
  }
  return {
    levels,
    assets: levels.includes(5) ? grant.allow.assets : [],
    ownerRules,
    allowQuotes: levels.includes(6) && grant.allow.quote_text,
    terms: grant.terms ?? null,
    notes,
  };
}

const ASSET_ITEM: Record<string, { kind: KitItem["kind"]; label: string; replaces: KitItem["kind"] }> = {
  icons: { kind: "icon", label: "Custom icons", replaces: "icon" },
  illustrations: { kind: "illustration", label: "Illustrations", replaces: "illustration" },
  photos: { kind: "image", label: "Photos", replaces: "image" },
};

/** Owner-approved files become free items under the owner's terms, replacing their style-only labels. */
function withOwnerAssets(items: KitItem[], files: KitFile[], terms: OwnerTerms | null): KitItem[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const group = file.path.split("/")[1];
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  if (!counts.size) return items;
  const replaced = new Set([...counts.keys()].map((g) => ASSET_ITEM[g].replaces));
  const kept = items.filter((i) => !(i.licence === "style_only" && replaced.has(i.kind) && i.kind !== "logo"));
  const granted = [...counts.entries()].map(([group, n]) => ({
    kind: ASSET_ITEM[group].kind,
    name: `${ASSET_ITEM[group].label} shared by the owner (${n})`,
    source: "assets/",
    licence: "free" as const,
    licence_name: `Granted by the owner${terms ? ` (${terms.licence})` : ""}`,
    alternative: null,
  }));
  return [...kept, ...granted];
}

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
export async function resolveKit(raw: string, options: { ip: string; writer?: DesignWriter; onProgress?: Progress }): Promise<BuildOutcome> {
  const progress: Progress = options.onProgress ?? (() => {});
  const screened = await screenTarget(raw);
  if (!screened.ok) return { status: "failed", failure: screened };
  const target = screened.value;

  // A cached kit only counts if it was built under the owner's current grant
  // (or both have none). A new opt-in makes the next request build a richer kit.
  const currentGrantHash = target.grant.status === "granted" ? target.grant.hash : null;
  const cached = await findReadyKit(target.sourceUrl, EXTRACTOR_VERSION);
  if (cached && cached.grantHash === currentGrantHash) return { status: "ready", kit: cached, cached: true };

  const rate = await checkBuildRate(options.ip);
  if (!rate.allowed) return { status: "rate_limited", resetAt: rate.resetAt };

  const lock = await startBuild(target, EXTRACTOR_VERSION, FLOW_VERSION);
  if (!lock.claimed) return { status: "building", slug: target.slug };

  const started = Date.now();
  try {
    const plan = await grantPlan(target);
    const extractor = createExtractor(target.sourceUrl, { assets: plan.assets });
    const rendered = await renderSite(target, extractor.visit, progress);
    if (!rendered.ok) {
      await failBuild(lock.kit_version_id, `${rendered.reason}: ${rendered.detail ?? ""}`);
      return { status: "failed", failure: rendered, slug: target.slug };
    }
    progress("extracting");
    const extraction = extractor.finish(rendered.value.finalUrl.toString());

    const version = await nextVersion(lock.kit_id);
    progress("writing", "rules, components and voice");
    const assetFiles = plan.assets.length && extraction.assetCandidates ? await buildAssetFiles(extraction.assetCandidates, plan.assets) : [];
    const kit = await generateKit(extraction, options.writer ?? geminiWriter(), {
      slug: target.slug,
      version,
      levels: plan.levels,
      ownerRules: plan.ownerRules,
      assets: assetFiles,
      allowQuotes: plan.allowQuotes,
      attribution: plan.terms?.attribution ?? null,
      terms: plan.terms,
    });
    kit.notes.push(...plan.notes);
    progress("packaging");
    const packaged = packageKit(kit.files, { skillName: kit.skillName, version, flowVersion: FLOW_VERSION });

    progress("publishing");
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
      items: withOwnerAssets(extraction.items, assetFiles, plan.terms),
      grantSnapshot: target.grant.status === "granted" ? (JSON.parse(target.grant.raw) as Json) : null,
      grantHash: currentGrantHash,
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
