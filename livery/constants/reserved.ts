// First path segments that belong to Livery itself. The livery.site/<url>
// shortcut must never treat these as a website to read.
export const RESERVED_SEGMENTS = new Set([
  "k", "admin", "auth", "me", "sign-in", "sign-up", "forgot-password", "update-password", "build", "combine", "create", "tastes", "explore", "how-it-works", "agents", "faq", "owners", "bot", "about", "legal", "design", "api", "auth", "_next",
  "favicon.ico", "icon.svg", "apple-icon.png", "robots.txt", "sitemap.xml", "manifest.webmanifest", "opengraph-image",
]);

// "favicon.png", "app.js": file requests, not websites.
const FILE_EXTENSION = /\.(ico|png|jpe?g|gif|svg|webp|avif|txt|xml|js|mjs|css|map|json|webmanifest|woff2?|php|env|git)$/i;

/** Whether the first segment of a path could be the start of a website address. */
export function looksLikeSiteSegment(segment: string | undefined) {
  if (!segment) return false;
  const value = decodeURIComponent(segment).toLowerCase();
  if (value === "https:" || value === "http:") return true;
  if (RESERVED_SEGMENTS.has(value) || value.startsWith(".") || !value.includes(".")) return false;
  return !FILE_EXTENSION.test(value);
}
