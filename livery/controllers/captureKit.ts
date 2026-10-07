import "server-only";
import { createHash } from "node:crypto";
import { EXTRACTOR_VERSION, FLOW_VERSION } from "@/constants/constants";
import { mergeSources, toExtraction, type StoredSource } from "@/lib/combine/merge";
import type { RawDesign } from "@/lib/extract/collect/collectDesign";
import { captureToSource } from "@/lib/extract/capture";
import type { Frame } from "@/lib/extract/frames";
import { generateKit } from "@/lib/generate/kit";
import { DEFAULT_LEVELS } from "@/lib/generate/levels";
import { measuredAnalysis, type VoiceProfile } from "@/lib/generate/measured";
import { packageKit } from "@/lib/generate/package";
import type { DesignWriter } from "@/lib/generate/writer";
import { refreshKitPages } from "@/lib/kit/revalidate";
import { errorText, logger } from "@/lib/logger";
import type { Json } from "@/lib/supabase/database.types";
import { registrableDomain } from "@/lib/url/site";
import { captureFrame, createOwnedKit, currentSources, findReadyVersion, kitBySlug, loadCapture, saveCapture, startOwnerVersion, type SourceRef, type TargetKit } from "@/services/captures";
import { loadFrames, loadSource } from "@/services/combined";
import { failBuild, nextVersion, publishBuild, uploadArtefacts, uploadFrames } from "@/services/kits";

export type CaptureTarget = { kind: "kit"; slug: string } | { kind: "new" };

export type CaptureInput = {
  userId: string;
  url: string;
  raw: RawDesign;
  voice?: VoiceProfile;
  frame: Buffer | null;
  viewport: { width: number; height: number };
  target: CaptureTarget;
};

export type CaptureOutcome =
  | { status: "ready"; path: string; slug: string; version: number; mode: "owned" | "copy" | "new" }
  | { status: "invalid"; message: string }
  | { status: "building" };

const MAX_SOURCES = 12;

/**
 * A page measured in the owner's own browser, added to a kit as a new private
 * version. The page's site must match the kit's (subdomains count). A kit the
 * user doesn't own is never changed: they get a private copy with the page
 * added. Nothing here contacts the site; it merges stored measurements.
 */
export async function addCapture(input: CaptureInput): Promise<CaptureOutcome> {
  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    return { status: "invalid", message: "That page address isn't valid." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { status: "invalid", message: "Only web pages can be measured." };
  const site = registrableDomain(url.hostname);
  if (!site) return { status: "invalid", message: "This page isn't on a public website." };
  const pageUrl = `${url.origin}${url.pathname}`;

  // Where it goes.
  let kit: TargetKit | null = null;
  let mode: "owned" | "copy" | "new" = "new";
  let base: SourceRef[] = [];
  if (input.target.kind === "kit") {
    kit = await kitBySlug(input.target.slug);
    if (!kit) return { status: "invalid", message: "That kit doesn't exist." };
    if (kit.kind === "taste" || !kit.domain) return { status: "invalid", message: "Pages can only be added to a kit for one site, not a taste." };
    if (registrableDomain(kit.domain) !== site) return { status: "invalid", message: `This page is on ${site}, but the kit is for ${registrableDomain(kit.domain) ?? kit.domain}. Pages must be from the same site.` };
    mode = kit.owner_id === input.userId ? "owned" : "copy";
    base = await currentSources(kit, mode === "copy");
  }

  // Store the capture (measurements and the content-removed frame; never text).
  const source = captureToSource(input.raw, pageUrl, input.voice);
  const captureId = await saveCapture({ ownerId: input.userId, url: pageUrl, host: url.hostname, domain: site, width: input.viewport.width, height: input.viewport.height, source, frame: input.frame });

  // A newer capture of the same page replaces the older one.
  const sources: SourceRef[] = [...base.filter((s) => !(s.captured && s.url === pageUrl)), { url: pageUrl, domain: url.hostname.replace(/^www\./, ""), captureId, slug: kit?.slug ?? "", version: 0, captured: true }];
  if (sources.length > MAX_SOURCES) return { status: "invalid", message: `A kit holds at most ${MAX_SOURCES} pages. Remove some before adding more.` };

  if (mode !== "owned") kit = await createOwnedKit(input.userId, kit?.domain ?? url.hostname);
  const owned = kit!;
  const hash = createHash("sha256").update(sources.map((s) => s.versionId ?? `capture:${s.captureId}`).join(",")).digest("hex");
  const lock = await startOwnerVersion(owned.id, input.userId, sources, hash, EXTRACTOR_VERSION, FLOW_VERSION);
  if (!lock.claimed) return { status: "building" };

  try {
    const loaded = await Promise.all(sources.map((s, i) => loadOne(s, i)));
    const frames = loaded.flatMap((l) => l.frames);
    const merged = loaded.length === 1 ? { extraction: toExtraction(loaded[0].source, frames), voice: loaded[0].source.voice } : mergeSources(loaded.map((l) => l.source), frames);
    const version = await nextVersion(owned.id);
    const siteName = owned.display_name ?? registrableDomain(owned.domain ?? site) ?? site;
    const writer: DesignWriter = { name: "measurements", write: async () => measuredAnalysis(merged.extraction, { voice: merged.voice }) };
    const kitSources = sources.map((s) => ({ url: s.url, slug: s.captured ? owned.slug : s.slug, version: s.captured ? version : s.version, ...(s.captured ? { captured: true } : {}) }));
    const kitFiles = await generateKit(merged.extraction, writer, { slug: owned.slug, version, siteName, sources: kitSources, levels: DEFAULT_LEVELS });
    const packaged = packageKit(kitFiles.files, { skillName: kitFiles.skillName, version, flowVersion: FLOW_VERSION });
    const paths = await uploadArtefacts(owned.slug, version, packaged);
    await uploadFrames(lock.kit_version_id, frames);
    const { extraction } = merged;
    const published = await publishBuild({
      versionId: lock.kit_version_id,
      data: {
        extraction: {
          source: extraction.source,
          tokens: extraction.tokens,
          fonts: extraction.fonts,
          icons: extraction.icons,
          components: extraction.components,
          imagery: extraction.imagery,
          items: extraction.items,
          voice: merged.voice,
          frames: frames.map(({ name, width, height }) => ({ name, width, height })),
        },
        analysis: kitFiles.analysis,
        notes: kitFiles.notes,
        sources: kitSources,
      } as unknown as Json,
      skillMd: kitFiles.files.find((f) => f.path === "SKILL.md")!.content.toString("utf8"),
      paths,
      manifest: packaged.manifest,
      contentHash: packaged.contentHash,
      levels: kitFiles.levels,
      items: extraction.items,
    });
    const ready = await findReadyVersion(owned.id, lock.kit_version_id);
    if (!ready || published !== version) throw new Error("published version not found");
    logger.info("kit.capture_added", { slug: owned.slug, version, mode, sources: sources.length });
    refreshKitPages();
    return { status: "ready", path: `/me/kits/${owned.slug}/v${version}`, slug: owned.slug, version, mode };
  } catch (error) {
    logger.error("kit.capture_failed", { slug: owned.slug, error: errorText(error) });
    await failBuild(lock.kit_version_id, errorText(error)).catch(() => {});
    throw error;
  }
}

// One source's measurements and frames. The first source supplies the
// desktop and phone frames; each other one adds its desktop frame.
async function loadOne(source: SourceRef, index: number): Promise<{ source: StoredSource; frames: Frame[] }> {
  const prefix = index === 0 ? "" : `${String(index + 1).padStart(2, "0")}-`;
  if (source.captureId) {
    const row = await loadCapture(source.captureId);
    const frame = await captureFrame(row, `${prefix}desktop`);
    return { source: row.data as unknown as StoredSource, frames: frame ? [frame] : [] };
  }
  const loaded = await loadSource(source.versionId!);
  const wanted = index === 0 ? [{ from: "desktop", as: "desktop" }, { from: "mobile", as: "mobile" }] : [{ from: "desktop", as: `${prefix}desktop` }];
  return { source: loaded.source, frames: await loadFrames(source.versionId!, wanted, loaded.frameSizes) };
}
