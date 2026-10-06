import "server-only";
import { getBrowser } from "@/lib/browser";
import { renderAt, WIDTHS, type RenderedPage } from "@/lib/extract/render";
import { fail, type Progress, type ReadFailure, type ReadResult } from "@/lib/extract/types";
import { detectBlock } from "@/lib/guards/detectBlock";
import { deniedCategory, isSensitivePath } from "@/lib/url/blocklist";
import { normaliseTarget, type Target } from "@/lib/url/normalise";
import { checkRobots } from "@/lib/url/robotsCheck";
import { safeFetch } from "@/lib/url/ssrf";
import { getActiveFailure, rememberFailure } from "@/services/readFailures";
import { isForbiddenByOwner } from "@/services/sites";

/**
 * Step 1: everything we can decide without contacting the site.
 * Ordered cheapest first. Never touches the network of the target.
 */
export async function screenTarget(raw: string): Promise<ReadResult<Target>> {
  const normalised = normaliseTarget(raw);
  if (!normalised.ok) return normalised;
  const target = normalised.value;

  const category = deniedCategory(target.domain);
  if (category) return fail("sensitive_page", `${target.domain} is a ${category} site`);
  if (isSensitivePath(target.url.pathname)) return fail("sensitive_page", `${target.url.pathname} is a sign-in or payment page`);

  if (await isForbiddenByOwner(target.domain)) return fail("blocked_by_owner", `the owner of ${target.domain} opted out`);

  const remembered = await getActiveFailure(target.sourceUrl);
  if (remembered) return remembered;

  return normalised;
}

export type Visit = (rendered: RenderedPage) => Promise<void>;

async function withOneRetry<T>(run: () => Promise<ReadResult<T>>): Promise<ReadResult<T>> {
  const first = await run();
  if (first.ok || first.reason !== "timeout") return first;
  return run();
}

/**
 * Step 2: contact the site. Resolves redirects safely, respects robots.txt,
 * renders the desktop width first and refuses anything that is blocked, empty
 * or sensitive. Only then are the other widths rendered. `visit` runs once per
 * width while the page is open (extraction plugs in here in Phase 4).
 * Failures are remembered so repeated requests don't hit the site again.
 */
export async function renderSite(target: Target, visit: Visit, onProgress: Progress = () => {}): Promise<ReadResult<{ finalUrl: URL }>> {
  const result = await renderSiteUnrecorded(target, visit, onProgress);
  if (!result.ok) await rememberFailure(target.sourceUrl, target.domain, result);
  return result;
}

async function renderSiteUnrecorded(target: Target, visit: Visit, onProgress: Progress): Promise<ReadResult<{ finalUrl: URL }>> {
  onProgress("checking", "redirects and robots.txt");
  // Preflight with our own fetch: every redirect hop is checked for https and public addresses.
  const preflight = await withOneRetry(() => safeFetch(target.url, { timeoutMs: 12_000 }));
  if (!preflight.ok) return preflight;
  const { response, finalUrl } = preflight.value;
  await response.body?.cancel();

  const finalCategory = deniedCategory(finalUrl.hostname);
  if (finalCategory) return fail("sensitive_page", `redirected to a ${finalCategory} site`);

  const robots = await checkRobots(finalUrl);
  if (robots) return robots;

  const browser = await getBrowser();
  try {
    const [desktop, ...rest] = [WIDTHS[2], WIDTHS[0], WIDTHS[1]];

    onProgress("rendering", `${desktop.width}px`);
    const first = await withOneRetry(() => renderAt(browser, finalUrl, desktop));
    if (!first.ok) return first;
    const blocked: ReadFailure | null = detectBlock(first.value.signals);
    if (blocked) {
      await first.value.context.close();
      return blocked;
    }
    try {
      await visit(first.value);
    } finally {
      await first.value.context.close();
    }

    for (const viewport of rest) {
      onProgress("rendering", `${viewport.width}px`);
      const rendered = await renderAt(browser, finalUrl, viewport);
      if (!rendered.ok) return rendered;
      try {
        await visit(rendered.value);
      } finally {
        await rendered.value.context.close();
      }
    }
    return { ok: true, value: { finalUrl } };
  } finally {
    await browser.close().catch(() => {});
  }
}
