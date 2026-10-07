import { getDomain } from "tldts";

/**
 * The site a host belongs to: "app.linear.app" and "linear.app" are both
 * "linear.app"; "a.github.io" and "b.github.io" stay apart (Public Suffix List,
 * private suffixes included). Null for IPs and single-label hosts.
 */
export function registrableDomain(host: string) {
  return getDomain(host.toLowerCase().replace(/^www\./, ""), { allowPrivateDomains: true });
}

export function sameSite(a: string, b: string) {
  const x = registrableDomain(a);
  return Boolean(x) && x === registrableDomain(b);
}
