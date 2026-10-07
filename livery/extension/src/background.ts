// The extension's background worker. Its only job: when the connect page on
// livery.site hands over a one-time code (via connect.ts), trade it for this
// browser's token and keep it in extension storage.
import { LIVERY_URL } from "./config";

chrome.runtime.onMessage.addListener((message: { type?: string; code?: string }, sender, reply) => {
  if (message?.type !== "livery:pair" || typeof message.code !== "string") return;
  // Only the connect page on Livery's own site may pair.
  if (!sender.url || !sender.url.startsWith(`${LIVERY_URL}/extension/connect`)) return;
  (async () => {
    try {
      const res = await fetch(`${LIVERY_URL}/api/extension/pair`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: message.code, label: describeBrowser() }),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; user?: { name?: string | null }; error?: string };
      if (!res.ok || !data.token) return reply({ ok: false, error: data.error ?? "Couldn't connect." });
      await chrome.storage.local.set({ token: data.token, name: data.user?.name ?? null });
      reply({ ok: true });
    } catch {
      reply({ ok: false, error: "Couldn't reach Livery." });
    }
  })();
  return true; // reply asynchronously
});

function describeBrowser() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Brave/.test(ua) ? "Brave" : "Chrome";
  const os = /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "another system";
  return `${browser} on ${os}`;
}
