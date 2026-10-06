import { createHash } from "node:crypto";
import { fail, type ReadResult } from "@/lib/extract/types";

export type Target = {
  /** Canonical https URL, the cache key: https://linear.app/features */
  sourceUrl: string;
  /** Host without "www.": linear.app */
  domain: string;
  /** URL-safe id used in kit paths: linear-app-features */
  slug: string;
  url: URL;
};

const HOST_PATTERN = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.(xn--[a-z0-9-]{2,59}|[a-z]{2,63})$/;

/**
 * Turns the path after livery.site/ (or any pasted URL) into a canonical target.
 * Paths arrive mangled by URL parsing ("https:/linear.app" with one slash), so
 * the scheme is repaired before parsing. Only public https hosts survive.
 */
export function normaliseTarget(raw: string): ReadResult<Target> {
  let input = raw.trim();
  try {
    input = decodeURIComponent(input);
  } catch {
    // Leave malformed escapes as they are; URL parsing decides below.
  }
  input = input.replace(/^(https?):\/*/i, "$1://");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) input = `https://${input}`;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return fail("unsafe_url", "not a valid URL");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return fail("unsafe_url", `${url.protocol} is not allowed`);
  if (url.username || url.password) return fail("unsafe_url", "URLs with credentials are not allowed");
  if (url.port && url.port !== "443" && url.port !== "80") return fail("unsafe_url", "custom ports are not allowed");

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!HOST_PATTERN.test(host)) return fail("unsafe_url", "only public domain names are allowed");

  const domain = host.replace(/^www\./, "");
  const path = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
  // Query strings and fragments are dropped: they are almost always tracking or state, not design.
  const canonical = new URL(`https://${domain}${path}`);

  return {
    ok: true,
    value: { sourceUrl: canonical.toString(), domain, slug: toSlug(domain, path), url: canonical },
  };
}

export function toSlug(domain: string, path: string) {
  const base = `${domain}${path === "/" ? "" : path}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= 100) return base;
  const hash = createHash("sha256").update(`${domain}${path}`).digest("hex").slice(0, 8);
  return `${base.slice(0, 91).replace(/-+$/, "")}-${hash}`;
}
