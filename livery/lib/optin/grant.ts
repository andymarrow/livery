import "server-only";
import { createHash } from "node:crypto";
import { safeFetch } from "@/lib/url/ssrf";
import { GRANT_MAX_BYTES, GRANT_PATH, GrantSchema, type Grant } from "./schema";

export type GrantFile = { grant: Grant; raw: string; hash: string; source: string };
export type GrantLookup = { file: GrantFile | null; detail: string };

const bare = (host: string) => host.toLowerCase().replace(/^www\./, "");

/** A grant covers its own host. The apex and its www. twin count as one host. */
export function sameSite(a: string, b: string) {
  return bare(a) === bare(b);
}

async function readGrantFile(url: URL, host: string): Promise<GrantLookup> {
  const result = await safeFetch(url, { timeoutMs: 8_000, maxRedirects: 3, accept: "application/json" });
  if (!result.ok) return { file: null, detail: `couldn't fetch it (${result.reason})` };
  const { response, finalUrl } = result.value;
  if (!sameSite(finalUrl.hostname, host)) {
    await response.body?.cancel();
    return { file: null, detail: `it redirects to ${finalUrl.hostname}; the file must live on the same host` };
  }
  if (response.status === 404) {
    await response.body?.cancel();
    return { file: null, detail: "not found" };
  }
  if (!response.ok) {
    await response.body?.cancel();
    return { file: null, detail: `HTTP ${response.status}` };
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > GRANT_MAX_BYTES) return { file: null, detail: "larger than 32 KB" };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { file: null, detail: "not valid JSON" };
  }
  const parsed = GrantSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { file: null, detail: `invalid: ${issue.path.join(".") || "file"} ${issue.message}` };
  }
  return {
    file: { grant: parsed.data, raw, hash: createHash("sha256").update(raw).digest("hex"), source: finalUrl.pathname },
    detail: "valid",
  };
}

const LINK_TAG = /<link\b[^>]*\brel=["']?livery["']?[^>]*>/i;
const HREF = /\bhref=["']?([^"'\s>]+)/i;

/** For site builders that can't serve /.well-known: <link rel="livery" href="..."> in the homepage head. */
async function findLinkedGrant(host: string): Promise<URL | null> {
  const home = await safeFetch(new URL(`https://${host}/`), { timeoutMs: 8_000 });
  if (!home.ok) return null;
  const { response, finalUrl } = home.value;
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) {
    await response.body?.cancel();
    return null;
  }
  const html = (await response.text()).slice(0, 512 * 1024);
  const head = html.slice(0, html.search(/<\/head>/i) > 0 ? html.search(/<\/head>/i) : html.length);
  const tag = head.match(LINK_TAG)?.[0];
  const href = tag?.match(HREF)?.[1];
  if (!href) return null;
  try {
    const url = new URL(href, finalUrl);
    return url.protocol === "https:" && sameSite(url.hostname, host) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Looks up the owner's grant for a host. The .well-known file wins; the link
 * tag is the fallback. Anything wrong means "no grant". Never guesses.
 */
export async function lookupGrant(host: string): Promise<GrantLookup> {
  const wellKnown = await readGrantFile(new URL(`https://${host}${GRANT_PATH}`), host);
  if (wellKnown.file || wellKnown.detail !== "not found") return wellKnown;
  const linked = await findLinkedGrant(host);
  if (!linked) return wellKnown;
  const viaLink = await readGrantFile(linked, host);
  return viaLink.file ? viaLink : { file: null, detail: `link rel="livery" found, but the file is ${viaLink.detail}` };
}

/** Glob match for grant paths: "*" matches anything, the rest is literal. */
function pathMatches(pattern: string, path: string) {
  const re = new RegExp(`^${pattern.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
  return re.test(path) || re.test(path.replace(/\/$/, "")) || re.test(`${path.replace(/\/$/, "")}/`);
}

/** Whether a grant applies to this page. Pages outside it fall back to style only. */
export function grantCovers(grant: Grant, path: string) {
  const include = grant.paths?.include ?? ["/", "/*"];
  const exclude = grant.paths?.exclude ?? [];
  return include.some((p) => pathMatches(p, path)) && !exclude.some((p) => pathMatches(p, path));
}

export const isOptOut = (grant: Grant) => grant.allow.levels.length === 0;
