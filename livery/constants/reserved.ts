// First path segments that belong to Livery itself. The livery.site/<url>
// shortcut must never treat these as a website to read.
export const RESERVED_SEGMENTS = new Set([
  "k",
  "explore",
  "owners",
  "bot",
  "about",
  "legal",
  "design",
  "api",
  "auth",
  "_next",
  "favicon.ico",
  "icon.svg",
  "robots.txt",
  "sitemap.xml",
]);
