import { SITE } from "@/constants/constants";
import { kitPath, kitUrl } from "@/lib/kit/urls";
import type { KitVersionView } from "@/services/kitRead";

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).replace(/[\s,;:.]+\S*$/, "")}…`);

/** A search snippet for a kit: what it looks like, then what it's for. */
export function kitDescription(view: KitVersionView) {
  const t = view.tokens;
  const traits = [
    t?.palette ? `${t.palette.scheme} theme` : null,
    t?.palette?.accent ? `accent ${t.palette.accent}` : null,
    t?.typography.families.display ? `${t.typography.families.display} type` : null,
  ].filter(Boolean);
  const lead = view.kind === "taste" ? `${view.title}, measured across ${view.sources.length} sites` : `The ${view.title} design system`;
  return clip(`${lead}${traits.length ? ` (${traits.join(", ")})` : ""}: colours, typography, spacing, components and motion as an installable skill for Claude Code, Cursor and Codex.`, 160);
}

/** schema.org for a kit page: the kit as a creative work based on its source sites, plus breadcrumbs. */
export function kitSchema(view: KitVersionView) {
  const url = `${SITE.url}${kitPath(view.slug, view.latestVersion)}`;
  const t = view.tokens;
  const keywords = [
    "design system",
    "design tokens",
    "Claude Code skill",
    "Cursor",
    t?.typography.families.display,
    t?.typography.families.body,
    t?.palette ? `${t.palette.scheme} theme` : null,
    ...(view.sources.length ? view.sources.map((s) => new URL(s.url).hostname.replace(/^www\./, "")) : []),
  ].filter((k): k is string => Boolean(k));
  const basedOn = (view.sources.length ? view.sources.map((s) => s.url) : view.sourceUrl ? [view.sourceUrl] : []).map((u) => ({ "@type": "WebSite", url: u }));
  return [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "@id": `${url}#kit`,
      name: `${view.title} design kit`,
      headline: view.kind === "taste" ? `${view.title}: a design taste for AI coding agents` : `${view.title} design system for AI coding agents`,
      description: view.analysis?.summary ?? kitDescription(view),
      url,
      version: String(view.version),
      datePublished: view.publishedAt,
      dateModified: view.publishedAt,
      inLanguage: "en",
      genre: "Design system",
      keywords: [...new Set(keywords)].join(", "),
      isBasedOn: basedOn,
      encoding: { "@type": "MediaObject", contentUrl: kitUrl(view.slug, view.version, "SKILL.md"), encodingFormat: "text/markdown" },
      publisher: { "@id": `${SITE.url}/#organization` },
      isPartOf: { "@id": `${SITE.url}/#website` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: view.kind === "taste" ? "Tastes" : "Library", item: `${SITE.url}${view.kind === "taste" ? "/tastes" : "/explore"}` },
        { "@type": "ListItem", position: 3, name: view.title, item: url },
      ],
    },
  ];
}
