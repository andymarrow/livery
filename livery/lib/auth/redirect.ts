/** Only same-site paths are followed after sign-in ("/me", not "//evil.com" or "https://…"). */
export function safeNext(next: string | null | undefined, fallback = "/me") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** The address this request came in on, so auth links return to the same host (www or not, localhost in dev). */
export function originOf(headers: Headers) {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "https://www.livery.site";
}
