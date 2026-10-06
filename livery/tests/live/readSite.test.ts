// Opt-in smoke test against real websites: LIVE=1 npx vitest run tests/live
// Exercises the network half of Phase 3 (safe fetch, robots, render, detection)
// without the database.
import { describe, expect, it } from "vitest";
import { getBrowser } from "@/lib/browser";
import { renderAt, WIDTHS } from "@/lib/extract/render";
import { detectBlock } from "@/lib/guards/detectBlock";
import { normaliseTarget } from "@/lib/url/normalise";
import { checkRobots } from "@/lib/url/robotsCheck";
import { safeFetch } from "@/lib/url/ssrf";

async function read(input: string) {
  const target = normaliseTarget(input);
  if (!target.ok) return target;
  const preflight = await safeFetch(target.value.url, { timeoutMs: 15_000 });
  if (!preflight.ok) return preflight;
  await preflight.value.response.body?.cancel();
  const robots = await checkRobots(preflight.value.finalUrl);
  if (robots) return robots;
  const browser = await getBrowser();
  try {
    const rendered = await renderAt(browser, preflight.value.finalUrl, WIDTHS[2]);
    if (!rendered.ok) return rendered;
    const { signals, context } = rendered.value;
    await context.close();
    const blocked = detectBlock(signals);
    console.log(input, "→", blocked?.reason ?? "ok", { status: signals.status, title: signals.title, text: signals.textLength, css: signals.stylesheetCount, finalUrl: signals.finalUrl });
    return blocked ?? { ok: true as const };
  } finally {
    await browser.close();
  }
}

describe.skipIf(!process.env.LIVE)("live sites", { timeout: 90_000 }, () => {
  it.each(["rize.roggy.site", "goatrank.lol", "linear.app", "vercel.com"])("reads %s", async (site) => {
    expect(await read(site)).toMatchObject({ ok: true });
  });
});
