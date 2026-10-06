import { DENIED_DOMAINS, DENIED_SUFFIXES, type DenyCategory } from "@/data/denylist";

/** Returns the reason a host is refused outright, or null. Subdomains inherit. */
export function deniedCategory(host: string): DenyCategory | null {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  for (let i = 0; i < labels.length; i++) {
    const candidate = labels.slice(i).join(".");
    if (DENIED_DOMAINS[candidate]) return DENIED_DOMAINS[candidate];
    if (i > 0 && DENIED_SUFFIXES[candidate]) return DENIED_SUFFIXES[candidate];
  }
  // Second-level government suffixes like gov.br, gob.mx, go.jp
  if (labels.length >= 3 && ["gov", "gob", "go", "gouv", "govt"].includes(labels[labels.length - 2])) return "government";
  return null;
}

// Paths that mean "sign in", "pay" or "manage an account" on an ordinary site.
const SENSITIVE_PATH = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(log-?in|sign-?in|sign-?on|sso|auth|oauth|checkout|pay|payment|payments|billing|wallet|account|my-account|cart\/checkout|password|reset-password|2fa|mfa|verify)(\/|$)/i;

export function isSensitivePath(pathname: string) {
  return SENSITIVE_PATH.test(pathname);
}
