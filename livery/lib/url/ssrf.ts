import "server-only";
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import ipaddr from "ipaddr.js";
import { Agent, fetch as undiciFetch, type Response } from "undici";
import { BOT } from "@/constants/constants";
import { fail, type ReadResult } from "@/lib/extract/types";

/** Only globally routable unicast addresses. Private, loopback, link-local
 *  (cloud metadata 169.254.169.254), CGNAT, multicast and tunnels are refused. */
export function isPublicAddress(address: string) {
  if (!ipaddr.isValid(address)) return false;
  let parsed = ipaddr.parse(address);
  if (parsed.kind() === "ipv6" && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
    parsed = (parsed as ipaddr.IPv6).toIPv4Address();
  }
  return parsed.range() === "unicast";
}

export function isUnsafeHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (ipaddr.isValid(host)) return !isPublicAddress(host);
  return false;
}

export async function resolvesToPublicAddresses(hostname: string): Promise<boolean> {
  if (isUnsafeHostname(hostname)) return false;
  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every((a) => isPublicAddress(a.address));
  } catch {
    return false;
  }
}

// Checks every address at connect time, so a DNS answer that changes between
// our check and the request (rebinding) still cannot reach a private address.
type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

function guardedLookup(hostname: string, options: { all?: boolean }, callback: LookupCallback) {
  lookup(hostname, { all: true, verbatim: true })
    .then((addresses) => {
      const unsafe = addresses.find((a) => !isPublicAddress(a.address));
      if (!addresses.length || unsafe) {
        const error: NodeJS.ErrnoException = new Error(`refusing to connect to non-public address for ${hostname}`);
        error.code = "EUNSAFEADDR";
        callback(error, "");
        return;
      }
      if (options.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    })
    .catch((error) => callback(error, ""));
}

const agent = new Agent({ connect: { lookup: guardedLookup as never }, connections: 16 });

export type SafeResponse = { response: Response; finalUrl: URL; redirects: number };

/**
 * fetch with Livery's rules: https only, public addresses only, at most
 * `maxRedirects` hops, each hop checked again, identified as LiveryBot.
 */
export async function safeFetch(
  input: URL,
  { maxRedirects = 5, timeoutMs = 10_000, method = "GET", accept = "text/html,*/*;q=0.8" } = {},
): Promise<ReadResult<SafeResponse>> {
  let url = new URL(input);
  const deadline = AbortSignal.timeout(timeoutMs);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (url.protocol !== "https:") return fail("unsafe_url", `redirected to a non-https URL (${url.protocol})`);
    if (isUnsafeHostname(url.hostname)) return fail("unsafe_url", `${url.hostname} is not a public host`);

    let response: Response;
    try {
      response = await undiciFetch(url, {
        method,
        redirect: "manual",
        signal: deadline,
        dispatcher: agent,
        headers: { "user-agent": BOT.userAgent, accept },
      });
    } catch (error) {
      const err = error as { name?: string; cause?: { code?: string } };
      if (err.cause?.code === "EUNSAFEADDR") return fail("unsafe_url", `${url.hostname} resolves to a non-public address`);
      if (err.name === "TimeoutError" || err.name === "AbortError") return fail("timeout", `no response from ${url.hostname}`);
      return fail("timeout", `could not connect to ${url.hostname}`);
    }

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      url = new URL(location, url);
      continue;
    }
    return { ok: true, value: { response, finalUrl: url, redirects: hop } };
  }

  return fail("unsafe_url", `more than ${maxRedirects} redirects`);
}
