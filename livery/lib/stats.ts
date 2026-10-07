import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { clientIp } from "@/lib/http";

// Who is counting, without accounts. Two fingerprints, both salted hashes:
// the anonymous id in a first-party cookie, and the network (IP + user
// agent). The database counts an event only when both are new for that kit.

export const VISITOR_COOKIE = "lv_id";
export type KitEvent = "view" | "like" | "download";

// Crawlers, link unfurlers and headless tools: their visits aren't people.
const BOTS = /bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse|pingdom|uptime|facebookexternalhit|embedly|whatsapp|discord|slack|telegram|curl\/7\.[0-2]|python-requests/i;

function salt() {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) throw new Error("IP_HASH_SECRET is not set");
  return secret;
}

const hash = (value: string) => createHash("sha256").update(`${value}${salt()}`).digest("hex");

export function isBot(headers: Headers) {
  const ua = headers.get("user-agent") ?? "";
  return !ua || BOTS.test(ua);
}

export function networkOf(headers: Headers) {
  return hash(`net:${clientIp(headers)}|${headers.get("user-agent") ?? ""}`);
}

/** The visitor's fingerprint, and a fresh cookie value when they don't have one yet. */
export function visitorOf(headers: Headers, cookie: string | undefined) {
  const id = cookie && /^[0-9a-f]{32}$/.test(cookie) ? cookie : null;
  const fresh = id ? null : randomBytes(16).toString("hex");
  return { visitor: hash(`visitor:${id ?? fresh}`), fresh };
}

/**
 * Counts a kit archive download after the response is sent. Agents and curl
 * have no cookie, so their network fingerprint stands in for the visitor.
 */
export async function countDownload(headers: Headers, cookie: string | undefined, kitId: string) {
  if (isBot(headers) || !process.env.IP_HASH_SECRET) return;
  const { recordEvent } = await import("@/services/stats");
  const network = networkOf(headers);
  const visitor = cookie && /^[0-9a-f]{32}$/.test(cookie) ? visitorOf(headers, cookie).visitor : network;
  await recordEvent(kitId, "download", visitor, network).catch(() => {});
}
