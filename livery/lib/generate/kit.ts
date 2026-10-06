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

type Meta = { slug: string; version: number; levels?: Level[]; attribution?: string | null };

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

function copied(a: Analysis, index: Set<string>) {
  return analysisStrings(a).flatMap(({ path, text }) => overlaps(text, index).map((gram) => ({ path, gram })));
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
  const siteName = new URL(extraction.source.finalUrl).hostname.replace(/^www\./, "");
  const skillName = skillNameFor(meta.slug);
  const levels = meta.levels ?? DEFAULT_LEVELS;
  const notes: string[] = [];
  const index = sourceIndex([...extraction.text.headings, ...extraction.text.paragraphs, ...extraction.text.actions]);
  const images = extraction.frames
    .filter((f) => f.name !== "tablet")
    .map((f) => ({ mimeType: "image/webp" as const, data: f.webp, label: `${f.name}, ${f.width}px wide` }));

  let analysis = await writer.write({ prompt: buildPrompt(extraction), images });
  let found = copied(analysis, index);
  if (found.length) {
    notes.push(`regenerated: ${found.length} phrase(s) matched the source text`);
    analysis = await writer.write({ prompt: buildPrompt(extraction, { avoidPhrases: [...new Set(found.map((f) => f.gram))].slice(0, 20) }), images });
    found = copied(analysis, index);
    if (found.length) {
      notes.push(`stripped ${found.length} string(s) that still matched the source text; voice examples dropped`);
      analysis = stripCopied(analysis, index);
    }
  }

  const files: KitFile[] = [];
  const add = (path: string, content: string | Buffer) => files.push({ path, content: typeof content === "string" ? Buffer.from(content, "utf8") : content });
  const licenceRequired = extraction.items.filter((i) => i.licence === "licence_required").length;
  const styleOnly = extraction.items.filter((i) => i.licence === "style_only").length;

  add(
    "SKILL.md",
    renderSkill({ skillName, siteName, version: meta.version, levels, summary: analysis.summary, licenceRequired, styleOnly, attribution: meta.attribution ?? null }),
  );
  add("rules.md", rulesMd(extraction, analysis, siteName));
  add("tokens.json", tokensJson(extraction));
  add("fonts.json", fontsJson(extraction));
  add("icons.json", iconsJson(extraction));
  add("components.md", componentsMd(extraction, analysis));
  add("layout.md", layoutMd(extraction, analysis));
  add("motion.md", motionMd(extraction, analysis));
  add("voice.md", voiceMd(analysis));
  add("licences.md", licencesMd(extraction, meta.attribution ?? null));
  for (const frame of extraction.frames) add(`frames/${frame.name}.webp`, frame.webp);

  assertKitIsClean(files, index);
  return { skillName, siteName, levels, files, analysis, notes };
}

const ALLOWED = /^(SKILL\.md|rules\.md|tokens\.json|fonts\.json|icons\.json|components\.md|layout\.md|motion\.md|voice\.md|licences\.md|frames\/(desktop|tablet|mobile)\.webp)$/;
const FONT_MAGIC = [Buffer.from("wOFF"), Buffer.from("wOF2"), Buffer.from([0x00, 0x01, 0x00, 0x00]), Buffer.from("OTTO")];

/** Final gate before packaging: only known files, no fonts or foreign images, no copied text. */
export function assertKitIsClean(files: KitFile[], index: Set<string>) {
  for (const file of files) {
    if (!ALLOWED.test(file.path)) throw new KitGuardError(`unexpected file in kit: ${file.path}`);
    if (FONT_MAGIC.some((magic) => file.content.subarray(0, magic.length).equals(magic))) throw new KitGuardError(`font data in ${file.path}`);
    if (file.path.endsWith(".webp")) {
      if (file.content.subarray(0, 4).toString() !== "RIFF" || file.content.subarray(8, 12).toString() !== "WEBP") throw new KitGuardError(`${file.path} is not a WebP frame`);
      continue;
    }
    const text = file.content.toString("utf8");
    if (/@font-face|<svg[\s>]|data:image\/|\.woff2?\b/i.test(text)) throw new KitGuardError(`${file.path} embeds an asset`);
    const matched = overlaps(text, index);
    if (matched.length) throw new KitGuardError(`${file.path} copies source text: "${matched[0]}"`);
  }
}
