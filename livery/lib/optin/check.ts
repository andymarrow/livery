import "server-only";
import { BOT } from "@/constants/constants";
import { checkRobots } from "@/lib/url/robotsCheck";
import { normaliseTarget } from "@/lib/url/normalise";
import { safeFetch } from "@/lib/url/ssrf";
import { GRANT_MAX_BYTES, GRANT_PATH, GrantSchema, type Grant } from "./schema";

export type CheckItem = { label: string; ok: boolean; detail: string };
export type SiteCheck = { host: string; items: CheckItem[]; grant: Grant | null; source: string | null };

async function fetchGrant(url: URL): Promise<{ grant: Grant | null; detail: string }> {
  const result = await safeFetch(url, { timeoutMs: 8_000, maxRedirects: 3, accept: "application/json" });
  if (!result.ok) return { grant: null, detail: `couldn't fetch it (${result.reason})` };
  const { response, finalUrl } = result.value;
  if (finalUrl.hostname !== url.hostname) {
    await response.body?.cancel();
    return { grant: null, detail: `it redirects to ${finalUrl.hostname}; the file must live on the same host` };
  }
  if (response.status === 404) {
    await response.body?.cancel();
    return { grant: null, detail: "not found" };
  }
  if (!response.ok) {
    await response.body?.cancel();
    return { grant: null, detail: `HTTP ${response.status}` };
  }
  const text = await response.text();
  if (Buffer.byteLength(text) > GRANT_MAX_BYTES) return { grant: null, detail: "larger than 32 KB" };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { grant: null, detail: "not valid JSON" };
  }
  const parsed = GrantSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { grant: null, detail: `invalid: ${issue.path.join(".") || "file"} ${issue.message}` };
  }
  return { grant: parsed.data, detail: "valid" };
}

/** Shows an owner exactly what Livery sees: reachability, robots.txt, bot walls and the opt-in file. */
export async function checkSite(input: string): Promise<SiteCheck | { error: string }> {
  const target = normaliseTarget(input);
  if (!target.ok) return { error: "That doesn't look like a public website address." };
  const host = target.value.url.hostname;
  const items: CheckItem[] = [];

  const home = await safeFetch(new URL(`https://${host}/`), { timeoutMs: 10_000 });
  if (!home.ok) {
    items.push({ label: "Reachable over https", ok: false, detail: home.detail ?? home.reason });
    return { host, items, grant: null, source: null };
  }
  const { response } = home.value;
  const blocked = response.headers.get("cf-mitigated") === "challenge" || response.headers.get("x-datadome") !== null || [403, 429].includes(response.status);
  await response.body?.cancel();
  items.push({ label: "Reachable over https", ok: true, detail: `HTTP ${response.status}` });
  items.push({
    label: "Not blocked by bot protection",
    ok: !blocked,
    detail: blocked ? `your protection challenged ${BOT.userAgent.split(" ")[0]}; allow it to let Livery read your site` : "LiveryBot got through",
  });

  const robots = await checkRobots(new URL(`https://${host}/`));
  items.push({ label: "Allowed by robots.txt", ok: !robots, detail: robots ? robots.detail ?? "disallowed" : "allowed" });

  const wellKnown = await fetchGrant(new URL(`https://${host}${GRANT_PATH}`));
  items.push({ label: `Opt-in file at ${GRANT_PATH}`, ok: Boolean(wellKnown.grant), detail: wellKnown.detail });

  const grant = wellKnown.grant;
  if (grant) {
    const levels = grant.allow.levels;
    items.push({
      label: "What the file grants",
      ok: true,
      detail: levels.length === 0 ? "opt-out: Livery will not build kits from this host" : `levels ${levels.join(", ")}${grant.allow.assets.length ? `; assets: ${grant.allow.assets.join(", ")}` : ""}${grant.allow.quote_text ? "; quoted copy" : ""}`,
    });
  }
  return { host, items, grant, source: grant ? GRANT_PATH : null };
}
