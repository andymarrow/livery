import type { NextRequest } from "next/server";
import { combineKit, type CombineOutcome } from "@/controllers/combineKit";
import type { BuildEvent } from "@/app/api/build/route";
import { COMBINE_LIMITS } from "@/lib/combine/identity";
import { clientIp } from "@/lib/http";
import { kitPath } from "@/lib/kit/urls";
import { logger } from "@/lib/logger";
import { supabaseConfigured } from "@/lib/supabase/configured";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export type CombineEvent =
  | Exclude<BuildEvent, { type: "failed" }>
  | { type: "failed"; reason: string; detail?: string; url: string }
  | { type: "invalid"; message: string }
  | { type: "needs_sources"; urls: string[] };

function toEvent(outcome: CombineOutcome): CombineEvent {
  switch (outcome.status) {
    case "ready":
      return { type: "ready", path: kitPath(outcome.kit.slug, outcome.kit.version), cached: outcome.cached };
    case "building":
      return { type: "building" };
    case "rate_limited":
      return { type: "rate_limited", resetAt: outcome.resetAt.toISOString() };
    case "invalid":
      return { type: "invalid", message: outcome.message };
    case "needs_sources":
      return { type: "needs_sources", urls: outcome.urls };
    case "failed":
      return { type: "failed", reason: outcome.failure.reason, detail: outcome.failure.detail, url: outcome.url };
  }
}

/** Combines already-built page kits into one site or taste kit, streaming its stages as NDJSON. */
export async function POST(request: NextRequest) {
  if (!supabaseConfigured()) return Response.json({ error: "not configured" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { kind?: unknown; urls?: unknown; curator?: unknown } | null;
  const urls = Array.isArray(body?.urls) ? body.urls : null;
  if (
    !body ||
    (body.kind !== "site" && body.kind !== "taste") ||
    !urls ||
    urls.length < COMBINE_LIMITS.min ||
    urls.length > COMBINE_LIMITS.max ||
    !urls.every((u): u is string => typeof u === "string" && u.length <= 2048) ||
    (body.curator != null && (typeof body.curator !== "string" || body.curator.length > 200))
  ) {
    return Response.json({ error: `kind and ${COMBINE_LIMITS.min}-${COMBINE_LIMITS.max} urls are required` }, { status: 400 });
  }
  const input = { kind: body.kind as "site" | "taste", urls, curator: (body.curator as string | undefined) ?? null };
  const ip = clientIp(request.headers);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: CombineEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The browser went away; the kit still publishes.
        }
      };
      try {
        const outcome = await combineKit(input, { ip, onProgress: (stage, detail) => send({ type: "stage", stage, detail }) });
        send(toEvent(outcome));
      } catch (error) {
        logger.error("combine.stream_error", { kind: input.kind, error: error instanceof Error ? error.message : String(error) });
        send({ type: "error", message: "Something went wrong on our side. Nothing was published. Try again in a minute." });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}
