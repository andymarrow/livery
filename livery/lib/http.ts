import "server-only";

/** First hop of x-forwarded-for (set by Vercel), else x-real-ip. */
export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "0.0.0.0";
}

/** Browsers ask for text/html; curl and agent fetch tools usually don't. */
export function wantsHtml(headers: Headers) {
  return (headers.get("accept") ?? "").includes("text/html");
}

export const markdown = (body: string, init: ResponseInit = {}) =>
  new Response(body, { ...init, headers: { "content-type": "text/markdown; charset=utf-8", ...init.headers } });

export const IMMUTABLE = "public, max-age=31536000, immutable";
