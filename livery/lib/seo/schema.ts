import { CREATOR, EXTENSION_STORE_URL, SITE } from "@/constants/constants";

// schema.org objects shared across pages. Ids tie them together, so the
// organisation, the website and the app read as one entity.

const ORG = `${SITE.url}/#organization`;
const WEBSITE = `${SITE.url}/#website`;
const APP = `${SITE.url}/#app`;

export const organization = {
  "@type": "Organization",
  "@id": ORG,
  name: SITE.name,
  url: SITE.url,
  logo: { "@type": "ImageObject", url: `${SITE.url}/icon.svg` },
  description: SITE.definition,
  sameAs: [CREATOR.x, EXTENSION_STORE_URL],
  founder: { "@type": "Person", name: CREATOR.handle.replace(/^@/, ""), url: CREATOR.x },
};

export const website = {
  "@type": "WebSite",
  "@id": WEBSITE,
  name: SITE.name,
  alternateName: [SITE.domain, "Livery design kits"],
  url: SITE.url,
  description: SITE.description,
  publisher: { "@id": ORG },
  inLanguage: "en",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/explore?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export const application = {
  "@type": "WebApplication",
  "@id": APP,
  name: SITE.name,
  url: SITE.url,
  description: SITE.definition,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires a modern browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": ORG },
  featureList: [
    "Measures a live website's colours, typography, spacing, radii, shadows, components and motion",
    "Writes an installable skill (SKILL.md, tokens.json, rules) for Claude Code, Cursor, Codex and Windsurf",
    "Combines several pages of one site, or several sites into a person's taste",
    "Never copies logos, images, fonts or text: style only",
    "Your agent audits your project and asks before changing anything",
  ],
};

/** The site-wide graph, rendered once in the root layout. */
export const siteGraph = { "@context": "https://schema.org", "@graph": [organization, website, application] };

/** Breadcrumbs: Home › … › this page. */
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${SITE.url}${item.path === "/" ? "" : item.path}` })),
  };
}

export function faqPage(questions: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

/** The browser extension, as an app with its store listing. */
export const extensionApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Livery browser extension",
  applicationCategory: "BrowserApplication",
  operatingSystem: "Chrome, Edge, Brave, Arc",
  url: `${SITE.url}/extension`,
  installUrl: EXTENSION_STORE_URL,
  downloadUrl: EXTENSION_STORE_URL,
  description: "Measure the design of pages behind your login, like your app's dashboard or settings, into a private Livery design kit. Text and images never leave the page.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": `${SITE.url}/#organization` },
};
