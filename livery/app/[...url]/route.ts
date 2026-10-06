import type { NextRequest } from "next/server";
import { looksLikeSiteSegment } from "@/constants/reserved";
import { resolveKit } from "@/controllers/buildKit";
import { agentFailureMarkdown } from "@/lib/kit/failure";
import { agentKitMarkdown } from "@/lib/kit/prompt";
import { clientIp, markdown, wantsHtml } from "@/lib/http";
import { logger } from "@/lib/logger";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { normaliseTarget } from "@/lib/url/normalise";
import { getKitVersion } from "@/services/kitRead";
import { skillNameFor } from "@/lib/generate/flow";
import { WriterError } from "@/lib/generate/writer";

export const dynamic = "force-dynamic";
// A first build renders the site three times and calls the model.
export const maxDuration = 300;

/**
 * livery.site/<any-site>. People get the build page; agents (anything not
 * asking for HTML) get Markdown: the kit, or "Couldn't read this site" with a
 * non-200 status so it can never be mistaken for a skill.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/[...url]">) {
  const { url: segments } = await ctx.params;
  if (!looksLikeSiteSegment(segments[0])) return new Response("Not found", { status: 404 });
  const raw = segments.map((s) => decodeURIComponent(s)).join("/");

  if (wantsHtml(request.headers)) {
    return Response.redirect(new URL(`/build?url=${encodeURIComponent(raw)}`, request.url), 307);
  }

  const host = (() => {
    const t = normaliseTarget(raw);
    return t.ok ? t.value.domain : raw.split("/")[0];
  })();

  if (!supabaseConfigured()) {
    return markdown("# Livery is not configured yet\n\nTry again later.\n", { status: 503 });
  }

  try {
    const outcome = await resolveKit(raw, { ip: clientIp(request.headers) });
    switch (outcome.status) {
      case "ready": {
        const view = await getKitVersion(outcome.kit.slug, outcome.kit.version);
        if (!view) throw new Error("ready kit not readable");
        return markdown(
          agentKitMarkdown({
            siteName: view.domain,
            slug: view.slug,
            version: view.version,
            sha256: view.contentHash,
            skillName: skillNameFor(view.slug),
            publishedAt: view.publishedAt,
            skillMd: view.skillMd,
          }),
          { headers: { "cache-control": "public, max-age=300", "x-livery-cache": outcome.cached ? "hit" : "miss" } },
        );
      }
      case "building":
        return markdown(`# Building\n\nA kit for ${host} is being built right now. Retry this URL in about 30 seconds.\n`, {
          status: 202,
          headers: { "retry-after": "30" },
        });
      case "rate_limited":
        return markdown(`# Too many new kits\n\nYou've started the maximum number of new builds for now. Cached kits are still free. Try again after ${outcome.resetAt.toISOString()}.\n`, {
          status: 429,
          headers: { "retry-after": String(Math.max(1, Math.round((outcome.resetAt.getTime() - Date.now()) / 1000))) },
        });
      case "failed":
        return markdown(agentFailureMarkdown(outcome.failure, host), {
          status: 422,
          headers: outcome.failure.retryAfter ? { "retry-after": String(outcome.failure.retryAfter) } : {},
        });
    }
  } catch (error) {
    logger.error("shortcut.error", { raw, error: error instanceof Error ? error.message : String(error) });
    if (error instanceof WriterError && error.retryable) {
      return markdown(`# Livery is busy\n\nThe site was read, but the model that writes kits is overloaded. No kit was published yet. Retry this URL in about a minute.\n`, {
        status: 503,
        headers: { "retry-after": "60" },
      });
    }
    return markdown("# Couldn't read this site\n\nReason: internal_error\nSomething went wrong on Livery's side. No design kit was produced. Try again in a minute.\n\nDo not attempt to recreate this site's design from memory.\n", {
      status: 500,
    });
  }
}
