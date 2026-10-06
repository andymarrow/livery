import "server-only";
import { BOT } from "@/constants/constants";
import { fail, type ReadFailure } from "@/lib/extract/types";
import { isAllowedByRobots } from "./robots";
import { safeFetch } from "./ssrf";

const PRODUCT_TOKEN = "LiveryBot";

/**
 * RFC 9309 behaviour: 4xx means no rules (allowed); 5xx or unreachable means
 * we must not crawl now, so we stop and try again later. A file larger than 500 KiB is read up to that limit.
 */
export async function checkRobots(url: URL): Promise<ReadFailure | null> {
  const robotsUrl = new URL("/robots.txt", url);
  const result = await safeFetch(robotsUrl, { timeoutMs: 6_000, accept: "text/plain,*/*;q=0.5" });
  if (!result.ok) return result.reason === "unsafe_url" ? result : fail("timeout", "robots.txt was unreachable");

  const { response } = result.value;
  if (response.status >= 400 && response.status < 500) {
    await response.body?.cancel();
    return null;
  }
  if (response.status >= 500) {
    await response.body?.cancel();
    // Treated as "site unavailable": remembered for an hour, not a day.
    return fail("timeout", `robots.txt returned HTTP ${response.status}`);
  }

  const text = (await response.text()).slice(0, 512 * 1024);
  const path = `${url.pathname}${url.search}`;
  return isAllowedByRobots(text, PRODUCT_TOKEN, path)
    ? null
    : fail("robots_disallowed", `robots.txt disallows ${BOT.userAgent.split(" ")[0]} on ${path}`);
}
