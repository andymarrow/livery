import "server-only";
import { EXTENSION_STORE_URL, SITE } from "@/constants/constants";
import { kitPath, kitUrl } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { listKits, type KitCard } from "@/services/kitRead";
import { GUIDES, type GuideBlock } from "./guides";

// llms.txt (https://llmstxt.org): a plain map of Livery for language models
// and AI answer engines, and a full-text version they can read in one fetch.

const PAGES: [string, string, string][] = [
  ["Create a kit", "/create", "Paste a website (or several pages of one site, or a designer's favourite sites) and get an installable design kit."],
  ["Library", "/explore", "Every published design kit: palettes, typography, spacing, components and motion measured from real sites."],
  ["Tastes", "/tastes", "Kits that measure one person's taste across the sites they picked."],
  ["How it works", "/how-it-works", "How Livery measures a site, writes the kit and how your agent applies it one area at a time."],
  ["Install in your agent", "/agents", "Install steps for Claude Code, Cursor, Codex, Windsurf and claude.ai."],
  ["Guides", "/guides", "Design systems for Claude Code, Cursor rules for design, design tokens for agents, style versus assets."],
  ["Browser extension", "/extension", `Measure pages behind your login (dashboards, settings) into a private kit. Install it free from the Chrome Web Store: ${EXTENSION_STORE_URL}`],
  ["FAQ", "/faq", "What Livery reads, what it never copies, and which agents it supports."],
  ["For site owners", "/owners", "Opt in with a livery.json file, check what LiveryBot sees, or opt out."],
  ["LiveryBot", "/bot", "The crawler's user agent and the robots.txt rules it follows."],
];

async function kits(limit: number): Promise<KitCard[]> {
  if (!supabaseConfigured()) return [];
  return (await listKits({ limit, sort: "viewed" }).catch(() => ({ cards: [] as KitCard[] }))).cards;
}

const kitLine = (k: KitCard) => `- [${k.title} design kit](${SITE.url}${kitPath(k.slug, k.version)}): ${k.kind === "taste" ? "a design taste" : "design system"}${k.scheme ? `, ${k.scheme} theme` : ""}${k.font ? `, ${k.font.replace(/^__|_[0-9a-f]{6}$/g, "")}` : ""}. Skill: ${kitUrl(k.slug, k.version, "SKILL.md")}`;

export async function llmsTxt() {
  const list = await kits(40);
  return `# ${SITE.name}

> ${SITE.definition}

Livery renders a public website at desktop, tablet and phone widths, measures its colours, typography, spacing, radii, shadows, components, motion and craft details, and writes an installable kit: SKILL.md (the steps an agent follows), tokens.json, rules.md and notes on components, layout, motion, details, stack and voice. Agents audit the project, report the gap, ask which areas to apply and commit one area at a time. Kits describe style only: Livery never copies logos, images, fonts or text. It is free. Any kit can be fetched by an agent at ${SITE.url}/k/<slug>/v<version>/SKILL.md, and a new kit is built by requesting ${SITE.domain}/<any-website>.

## Pages

${PAGES.map(([name, path, text]) => `- [${name}](${SITE.url}${path}): ${text}`).join("\n")}

## Guides

${GUIDES.map((g) => `- [${g.title}](${SITE.url}/guides/${g.slug}): ${g.description}`).join("\n")}
${list.length ? `\n## Design kits\n\n${list.map(kitLine).join("\n")}\n` : ""}
## Optional

- [Full text for language models](${SITE.url}/llms-full.txt)
- [Privacy](${SITE.url}/legal/privacy): what is collected, and how the browser extension handles data
- [Terms](${SITE.url}/legal/terms)
`;
}

const blockText = (b: GuideBlock) => (typeof b === "string" ? b : "list" in b ? b.list.map((x) => `- ${x}`).join("\n") : "steps" in b ? b.steps.map((x, i) => `${i + 1}. ${x}`).join("\n") : "code" in b ? `\`\`\`\n${b.code}\n\`\`\`` : b.note);

export async function llmsFullTxt(faq: { q: string; a: string }[]) {
  const list = await kits(500);
  return `${await llmsTxt()}
---

# How Livery works

1. Paste a link on ${SITE.domain}, or put ${SITE.domain}/ in front of any public website. LiveryBot checks robots.txt and the owner's livery.json, renders the page at three screen sizes and measures its design.
2. Livery writes a kit with the reasons behind each value, labels every font, icon set and asset as free to reuse, needing a licence (with a free alternative) or style only, and publishes it at a permanent, versioned address with a sha256 hash.
3. Your agent installs the kit (one paste in Claude Code; unzip for Cursor, Codex and Windsurf), audits your project, asks which areas to apply and commits each one separately so it can be reverted.

# Frequently asked questions

${faq.map(({ q, a }) => `## ${q}\n\n${a}`).join("\n\n")}

${GUIDES.map((g) => `# ${g.title}\n\n${g.answer}\n\n${g.sections.map((s) => `## ${s.heading}\n\n${s.blocks.map(blockText).join("\n\n")}`).join("\n\n")}`).join("\n\n---\n\n")}
${list.length ? `\n---\n\n# All design kits\n\n${list.map(kitLine).join("\n")}\n` : ""}`;
}
