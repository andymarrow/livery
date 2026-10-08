import "server-only";
import { refreshKitPages } from "@/lib/kit/revalidate";
import { EXTRACTOR_VERSION, FLOW_VERSION } from "@/constants/constants";
import { COMBINE_LIMITS, cleanCurator, combinedName, combinedSlug, sourcesHash, sourcesKey, type CombinedKind } from "@/lib/combine/identity";
import { mergeSources, toExtraction } from "@/lib/combine/merge";
import type { Frame } from "@/lib/extract/frames";
import type { Progress, ReadFailure } from "@/lib/extract/types";
import { generateKit } from "@/lib/generate/kit";
import { DEFAULT_LEVELS } from "@/lib/generate/levels";
import { measuredAnalysis } from "@/lib/generate/measured";
import { packageKit } from "@/lib/generate/package";
import { tasteAnalysis } from "@/lib/generate/taste";
import type { DesignWriter } from "@/lib/generate/writer";
import { logger } from "@/lib/logger";
import { checkBuildRate } from "@/lib/rateLimit";
import type { Json } from "@/lib/supabase/database.types";
import { findReadyCombined, getCombinedKit, loadFrames, loadSource, startCombinedBuild, startCombinedVersion } from "@/services/combined";
import { failBuild, findReadyKit, nextVersion, publishBuild, uploadArtefacts, uploadFrames, type ReadyKit } from "@/services/kits";
import { screenTarget } from "./readSite";

export type CombineRequest = { kind: CombinedKind; urls: string[]; curator?: string | null };

export type CombineOutcome =
  | { status: "ready"; kit: ReadyKit; cached: boolean }
  | { status: "building"; slug: string }
  | { status: "rate_limited"; resetAt: Date }
  | { status: "invalid"; message: string }
  /** These links have no published page kit yet: build them first. */
  | { status: "needs_sources"; urls: string[] }
  | { status: "failed"; failure: ReadFailure; url: string };

/**
 * Builds one kit from 2-5 links: several pages of one site ("site") or
 * several sites one person picked ("taste"). Every link must already be a
 * published page kit, built and screened by resolveKit, so guardrails, opt-in
 * and caching stay per page. This step only merges stored measurements: it
 * never contacts the sites, so it fits easily in one request.
 */
export async function combineKit(
  request: CombineRequest,
  options: { ip: string; onProgress?: Progress; /** Admin: not counted against a visitor's limit. */ skipRate?: boolean; /** Admin: publish as the next version of this combined kit. */ kitId?: string; /** Admin: allow more links than a visitor may combine. */ maxLinks?: number; /** The signed-in builder: owns the kit if it's new. */ ownerId?: string | null },
): Promise<CombineOutcome> {
  const progress: Progress = options.onProgress ?? (() => {});
  const { kind } = request;
  if (kind !== "site" && kind !== "taste") return { status: "invalid", message: "Choose pages of one site or a person's taste." };
  const urls = request.urls.map((u) => u.trim()).filter(Boolean);
  const max = Math.min(options.maxLinks ?? COMBINE_LIMITS.max, COMBINE_LIMITS.adminMax);
  if (urls.length < COMBINE_LIMITS.min || urls.length > max) {
    return { status: "invalid", message: `Paste between ${COMBINE_LIMITS.min} and ${max} links.` };
  }

  progress("checking", "every link, against the guardrails");
  const targets = [];
  for (const url of urls) {
    const screened = await screenTarget(url);
    if (!screened.ok) return { status: "failed", failure: screened, url };
    targets.push(screened.value);
  }
  if (new Set(targets.map((t) => t.sourceUrl)).size !== targets.length) return { status: "invalid", message: "Each link must be a different page." };
  const domains = [...new Set(targets.map((t) => t.domain))];
  if (kind === "site" && domains.length > 1) return { status: "invalid", message: `Pages of one site must share a domain; these span ${domains.join(", ")}.` };

  const sources: { target: (typeof targets)[number]; kit: ReadyKit }[] = [];
  const missing: string[] = [];
  for (const target of targets) {
    const kit = await findReadyKit(target.sourceUrl, EXTRACTOR_VERSION);
    const grantHash = target.grant.status === "granted" ? target.grant.hash : null;
    if (kit && kit.grantHash === grantHash) sources.push({ target, kit });
    else missing.push(target.sourceUrl);
  }
  if (missing.length) return { status: "needs_sources", urls: missing };

  const named = kind === "taste" ? cleanCurator(request.curator) : null;
  // An admin editing a taste keeps its kind and domain rules; the name can change.
  const hosts = domains;
  const key = sourcesKey(kind, named?.curatorSlug ?? null, targets.map((t) => t.sourceUrl));
  const hash = sourcesHash(sources.map((s) => s.kit.versionId));
  const existing = options.kitId ? await getCombinedKit(options.kitId) : null;
  const slug = existing?.slug ?? combinedSlug(kind, key, { domain: domains[0], curatorSlug: named?.curatorSlug, hosts });

  const cached = await findReadyCombined(key, EXTRACTOR_VERSION, hash);
  if (cached && (!existing || cached.kitId === existing.id)) return { status: "ready", kit: cached, cached: true };

  if (!options.skipRate) {
    const rate = await checkBuildRate(options.ip);
    if (!rate.allowed) return { status: "rate_limited", resetAt: rate.resetAt };
  }

  const sourceRows = sources.map((s, i) => ({ position: i + 1, source_url: s.target.sourceUrl, domain: s.target.domain, source_version_id: s.kit.versionId }));
  const lock = existing
    ? await startCombinedVersion({ kitId: existing.id, sourcesKey: key, sources: sourceRows, sourcesHash: hash, extractorVersion: EXTRACTOR_VERSION, flowVersion: FLOW_VERSION })
    : await startCombinedBuild({
        ownerId: options.ownerId ?? null,
    kind,
    sourcesKey: key,
    domain: kind === "site" ? domains[0] : null,
    slug,
    curator: named?.curator ?? null,
    curatorSlug: named?.curatorSlug ?? null,
    sources: sourceRows,
    sourcesHash: hash,
    extractorVersion: EXTRACTOR_VERSION,
    flowVersion: FLOW_VERSION,
  });
  if (!lock.claimed) return { status: "building", slug };

  const started = Date.now();
  try {
    progress("extracting", `combining ${sources.length} measured pages`);
    const loaded = await Promise.all(sources.map((s) => loadSource(s.kit.versionId)));
    // The first link's desktop and phone frames, then each other link's desktop frame.
    const frameSets = await Promise.all(
      sources.map((s, i) =>
        loadFrames(
          s.kit.versionId,
          i === 0 ? [{ from: "desktop", as: "desktop" }, { from: "mobile", as: "mobile" }] : [{ from: "desktop", as: `${String(i + 1).padStart(2, "0")}-desktop` }],
          loaded[i].frameSizes,
        ),
      ),
    );
    const frames: Frame[] = frameSets.flat();
    const { extraction, voice } = mergeSources(
      loaded.map((l) => l.source),
      frames,
    );

    const siteName = combinedName(kind, { domain: domains[0], curator: named?.curator, hosts });
    const writer: DesignWriter = {
      name: "measurements",
      write: async () =>
        kind === "taste" ? tasteAnalysis(extraction, loaded.map((l) => toExtraction(l.source)), { label: siteName, voice }) : measuredAnalysis(extraction, { voice }),
    };

    const version = await nextVersion(lock.kit_id);
    progress("writing", kind === "taste" ? "the habits every site shares" : "rules from every page");
    const kitSources = sources.map((s) => ({ url: s.target.sourceUrl, slug: s.kit.slug, version: s.kit.version }));
    const kit = await generateKit(extraction, writer, { slug, version, siteName, sources: kitSources, levels: DEFAULT_LEVELS });
    if (!voice) kit.notes.push("voice: no stored copy measurements in the sources; rebuild them to add voice rules");

    progress("packaging");
    const packaged = packageKit(kit.files, { skillName: kit.skillName, version, flowVersion: FLOW_VERSION });
    progress("publishing");
    const paths = await uploadArtefacts(slug, version, packaged);
    await uploadFrames(lock.kit_version_id, frames);

    const published = await publishBuild({
      versionId: lock.kit_version_id,
      data: {
        // Measurements only, as for page kits: no copy (there is none) and frame sizes, not frames.
        extraction: {
          source: extraction.source,
          tokens: extraction.tokens,
          fonts: extraction.fonts,
          icons: extraction.icons,
          components: extraction.components,
          imagery: extraction.imagery,
          items: extraction.items,
          voice,
          frames: frames.map(({ name, width, height }) => ({ name, width, height })),
        },
        analysis: kit.analysis,
        notes: kit.notes,
        sources: kitSources,
      } as unknown as Json,
      skillMd: kit.files.find((f) => f.path === "SKILL.md")!.content.toString("utf8"),
      paths,
      manifest: packaged.manifest,
      contentHash: packaged.contentHash,
      levels: kit.levels,
      items: extraction.items,
    });
    if (published !== version) throw new Error(`version mismatch: uploaded v${version}, published v${published}`);

    logger.info("kit.combined", { slug, kind, sources: sources.length, version, ms: Date.now() - started });
    refreshKitPages();
    const ready = await findReadyCombined(key, EXTRACTOR_VERSION, hash);
    if (!ready) throw new Error("published kit not found");
    return { status: "ready", kit: ready, cached: false };
  } catch (error) {
    logger.error("kit.combine_failed", { slug, error: error instanceof Error ? error.message : String(error) });
    await failBuild(lock.kit_version_id, error instanceof Error ? error.message : String(error)).catch(() => {});
    throw error;
  }
}
