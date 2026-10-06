// Turns whatever someone pastes ("https://www.Linear.app/features?ref=x")
// into the path part of the livery.site/<url> shortcut ("linear.app/features").
// This is only for display and copying. Real validation (https, private
// addresses, redirects, blocklist) happens on the server before any request.

export type ShortcutResult = { ok: true; path: string; host: string } | { ok: false; reason: "empty" | "invalid" };

const HOST_PATTERN = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,63}$/;

export function toShortcut(input: string): ShortcutResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  const withoutLivery = trimmed.replace(/^(https?:\/\/)?(www\.)?livery\.site\/+/i, "");
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(withoutLivery) ? withoutLivery : `https://${withoutLivery}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "invalid" };
  if (url.username || url.password || url.port) return { ok: false, reason: "invalid" };

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!HOST_PATTERN.test(host)) return { ok: false, reason: "invalid" };

  const pathname = url.pathname.replace(/\/+$/, "");
  return { ok: true, host, path: `${host}${pathname}` };
}
