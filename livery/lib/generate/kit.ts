import type { Extraction } from "@/lib/extract";
import type { Analysis } from "./analysis";
import { componentsMd, fontsJson, iconsJson, layoutMd, licencesMd, motionMd, rulesMd, tokensJson, voiceMd } from "./files";
import { renderSkill, skillNameFor } from "./flow";
import { DEFAULT_LEVELS, type Level } from "./levels";
import { overlaps, sourceIndex } from "./overlap";
import { buildPrompt } from "./prompt";
import type { DesignWriter } from "./writer";

export type KitFile = { path: string; content: Buffer };

export type Kit = {
  skillName: string;
  siteName: string;
  levels: Level[];
  files: KitFile[];
  analysis: Analysis;
  /** Notes about decisions the generator made (e.g. examples dropped by the copy guard). */
  notes: string[];
};

export class KitGuardError extends Error {}

export type OwnerTerms = { licence: string; commercial: boolean; attribution?: string };

/** One link a combined kit was made from. */
export type KitSource = { url: string; slug: string; version: number; /** Measured in the owner's browser (extension), not a library kit of its own. */ captured?: boolean };

type Meta = {
  slug: string;
  /** Overrides the host as the kit's display name (combined kits). */
  siteName?: string;
  /** Combined kits: the page kits this one was made from, in order. */
  sources?: KitSource[];
  version: number;
  levels?: Level[];
  attribution?: string | null;
  /** Level 4: the owner's own design rules document. */
  ownerRules?: string | null;
  /** Level 5: asset files the owner allows to be copied. */
  assets?: KitFile[];
  /** Level 6: real sentences from the site are allowed in voice examples. */
  allowQuotes?: boolean;
  terms?: OwnerTerms | null;
};

// Which files each level contributes. SKILL.md, rules.md, licences.md and frames are always there.
const LEVEL_FILES: Record<1 | 2 | 3, string[]> = {
  1: ["tokens.json", "fonts.json", "icons.json"],
  2: ["components.md", "layout.md"],
  3: ["motion.md", "voice.md"],
};

// Every string the model wrote, with a path so offending parts can be named.
function analysisStrings(a: Analysis): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === "string") out.push({ path, text: value });
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
  };
  walk(a, "");
  return out;
}

function copied(a: Analysis, index: Set<string>, allowQuotes = false) {
  return analysisStrings(a)
    .filter(({ path }) => !(allowQuotes && path.startsWith("voice.examples")))
    .flatMap(({ path, text }) => overlaps(text, index).map((gram) => ({ path, gram })));
}

/** Removes every string that still copies the source after a regenerate. */
function stripCopied(a: Analysis, index: Set<string>): Analysis {
  const clean = (text: string) => overlaps(text, index).length === 0;
  return {
    ...a,
    principles: a.principles.filter((p) => clean(p.rule) && clean(p.why) && clean(p.title)),
    never: a.never.filter((n) => clean(n.rule) && clean(n.why)),
    colour: a.colour.filter(clean),
    typography: a.typography.filter(clean),
    shape: a.shape.filter(clean),
    components: a.components.filter((c) => clean(c.recipe) && clean(c.states) && clean(c.use_when)),
    layout: a.layout.filter(clean),
    motion: { feel: clean(a.motion.feel) ? a.motion.feel : "", rules: a.motion.rules.filter(clean) },
    imagery: a.imagery.filter(clean),
    voice: { tone: a.voice.tone, rules: a.voice.rules.filter(clean), examples: [] },
    summary: clean(a.summary) ? a.summary : "",
  };
}

/**
 * Asks the writer for an analysis, enforces the copy guard (regenerate once
 * with the offending phrases named, then strip what still matches), and
 * renders every kit file.
 */
export async function generateKit(extraction: Extraction, writer: DesignWriter, meta: Meta): Promise<Kit> {
  const siteName = meta.siteName ?? new URL(extraction.source.finalUrl).hostname.replace(/^www\./, "");
  const skillName = skillNameFor(meta.slug);
  const levels = meta.levels ?? DEFAULT_LEVELS;
  const notes: string[] = [];
  const index = sourceIndex([...extraction.text.headings, ...extraction.text.paragraphs, ...extraction.text.actions]);
  const images = extraction.frames
    .filter((f) => f.name !== "tablet")
    .map((f) => ({ mimeType: "image/webp" as const, data: f.webp, label: `${f.name}, ${f.width}px wide` }));

  let analysis = await writer.write({ prompt: buildPrompt(extraction), images });
  const allowQuotes = Boolean(meta.allowQuotes);
  let found = copied(analysis, index, allowQuotes);
  if (found.length) {
    notes.push(`regenerated: ${found.length} phrase(s) matched the source text`);
    analysis = await writer.write({ prompt: buildPrompt(extraction, { avoidPhrases: [...new Set(found.map((f) => f.gram))].slice(0, 20) }), images });
    found = copied(analysis, index, allowQuotes);
    if (found.length) {
      notes.push(`stripped ${found.length} string(s) that still matched the source text; voice examples dropped`);
      analysis = stripCopied(analysis, index);
    }
  }

  const files: KitFile[] = [];
  const add = (path: string, content: string | Buffer) => files.push({ path, content: typeof content === "string" ? Buffer.from(content, "utf8") : content });
  const licenceRequired = extraction.items.filter((i) => i.licence === "licence_required").length;
  const styleOnly = extraction.items.filter((i) => i.licence === "style_only").length;

  const included = new Set(levels.flatMap((l) => (l <= 3 ? LEVEL_FILES[l as 1 | 2 | 3] : [])));
  const ownerRules = levels.includes(4) && meta.ownerRules ? meta.ownerRules : null;
  const assets = levels.includes(5) ? (meta.assets ?? []) : [];
  const dataFiles = [
    ...(ownerRules ? ["owner-rules.md"] : []),
    "rules.md",
    ...["tokens.json", "fonts.json", "icons.json", "components.md", "layout.md", "motion.md", "voice.md"].filter((f) => included.has(f)),
    "licences.md",
    ...(assets.length ? ["assets/"] : []),
    "frames/",
  ];

  add(
    "SKILL.md",
    renderSkill({ skillName, siteName, version: meta.version, levels, summary: analysis.summary, licenceRequired, styleOnly, attribution: meta.attribution ?? null, files: dataFiles }),
  );
  if (ownerRules) add("owner-rules.md", `# ${siteName}: the owner's design rules\n\nWritten by the site's owner and shared through their livery.json. Where these disagree with rules.md, these win.\n\n---\n\n${ownerRules}`);
  add("rules.md", rulesMd(extraction, analysis, siteName, Boolean(ownerRules), meta.sources));
  if (included.has("tokens.json")) add("tokens.json", tokensJson(extraction, meta.sources));
  if (included.has("fonts.json")) add("fonts.json", fontsJson(extraction));
  if (included.has("icons.json")) add("icons.json", iconsJson(extraction));
  if (included.has("components.md")) add("components.md", componentsMd(extraction, analysis));
  if (included.has("layout.md")) add("layout.md", layoutMd(extraction, analysis));
  if (included.has("motion.md")) add("motion.md", motionMd(extraction, analysis));
  if (included.has("voice.md")) add("voice.md", voiceMd(analysis));
  add("licences.md", licencesMd(extraction, meta.attribution ?? null, meta.terms ?? null, assets.length));
  for (const asset of assets) files.push(asset);
  for (const frame of extraction.frames) add(`frames/${frame.name}.webp`, frame.webp);

  assertKitIsClean(files, index, { allowQuotesIn: allowQuotes ? ["voice.md"] : [], ownerFiles: ownerRules ? ["owner-rules.md"] : [] });
  return { skillName, siteName, levels, files, analysis, notes };
}

const ALLOWED =
  /^(SKILL\.md|rules\.md|owner-rules\.md|tokens\.json|fonts\.json|icons\.json|components\.md|layout\.md|motion\.md|voice\.md|licences\.md|frames\/([0-9]{2}-)?(desktop|tablet|mobile)\.webp|assets\/(icons|illustrations)\/[a-z0-9-]+\.svg|assets\/photos\/[a-z0-9-]+\.(jpg|png|webp|avif))$/;
const FONT_MAGIC = [Buffer.from("wOFF"), Buffer.from("wOF2"), Buffer.from([0x00, 0x01, 0x00, 0x00]), Buffer.from("OTTO")];
const IMAGE_MAGIC: Record<string, (b: Buffer) => boolean> = {
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP",
  avif: (b) => b.subarray(4, 12).toString().startsWith("ftypavi"),
};

type CleanOptions = { allowQuotesIn?: string[]; ownerFiles?: string[] };

/**
 * Final gate before packaging: only known files, no fonts or foreign images,
 * no copied text. Owner-granted assets (assets/) are the only place SVG or
 * photos may appear, and only when the owner allowed them upstream.
 */
export function assertKitIsClean(files: KitFile[], index: Set<string>, options: CleanOptions = {}) {
  for (const file of files) {
    if (!ALLOWED.test(file.path)) throw new KitGuardError(`unexpected file in kit: ${file.path}`);
    if (FONT_MAGIC.some((magic) => file.content.subarray(0, magic.length).equals(magic))) throw new KitGuardError(`font data in ${file.path}`);
    if (file.path.startsWith("frames/")) {
      if (!IMAGE_MAGIC.webp(file.content)) throw new KitGuardError(`${file.path} is not a WebP frame`);
      continue;
    }
    if (file.path.startsWith("assets/photos/")) {
      const ext = file.path.split(".").pop()!;
      if (!IMAGE_MAGIC[ext]?.(file.content)) throw new KitGuardError(`${file.path} is not a ${ext} image`);
      continue;
    }
    const text = file.content.toString("utf8");
    if (file.path.startsWith("assets/")) {
      if (!/^\s*<svg[\s>]/i.test(text) || /<script|<foreignObject|\son[a-z]+\s*=|javascript:/i.test(text)) throw new KitGuardError(`${file.path} is not a clean SVG`);
      continue;
    }
    if (/@font-face|<svg[\s>]|data:image\/|\.woff2?\b/i.test(text)) throw new KitGuardError(`${file.path} embeds an asset`);
    if (options.ownerFiles?.includes(file.path)) continue; // the owner's own words, shared on purpose
    if (options.allowQuotesIn?.includes(file.path)) continue;
    const matched = overlaps(text, index);
    if (matched.length) throw new KitGuardError(`${file.path} copies source text: "${matched[0]}"`);
  }
}
