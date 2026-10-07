import type { NextRequest } from "next/server";
import { resolveKit, type BuildOutcome } from "@/controllers/buildKit";
import type { BuildStage } from "@/lib/extract/types";
import { clientIp } from "@/lib/http";
import { currentUser } from "@/utils/supabase/server";
import { kitPath } from "@/lib/kit/urls";
import { WriterError } from "@/lib/generate/writer";
import { logger } from "@/lib/logger";
import { supabaseConfigured } from "@/lib/supabase/configured";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export type BuildEvent =
  | { type: "stage"; stage: BuildStage; detail?: string }
  | { type: "ready"; path: string; cached: boolean }
  | { type: "building" }
  | { type: "rate_limited"; resetAt: string }
  | { type: "failed"; reason: string; detail?: string }
  | { type: "error"; message: string };

function toEvent(outcome: BuildOutcome): BuildEvent {
  switch (outcome.status) {
    case "ready":
      return { type: "ready", path: kitPath(outcome.kit.slug, outcome.kit.version), cached: outcome.cached };
    case "building":
      return { type: "building" };
    case "rate_limited":
      return { type: "rate_limited", resetAt: outcome.resetAt.toISOString() };
    case "failed":
      return { type: "failed", reason: outcome.failure.reason, detail: outcome.failure.detail };
  }
}

/** Runs a build and streams its real stages as newline-delimited JSON. */
export async function POST(request: NextRequest) {
  if (!supabaseConfigured()) return Response.json({ error: "not configured" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  if (!body || typeof body.url !== "string" || body.url.length > 2048) return Response.json({ error: "url is required" }, { status: 400 });
  const url = body.url;
  const ip = clientIp(request.headers);
  const ownerId = (await currentUser().catch(() => null))?.id ?? null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: BuildEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The browser went away; the build carries on and is cached for next time.
        }
      };
      try {
        const outcome = await resolveKit(url, { ip, ownerId, onProgress: (stage, detail) => send({ type: "stage", stage, detail }) });
        send(toEvent(outcome));
      } catch (error) {
        logger.error("build.stream_error", { url, error: error instanceof Error ? error.message : String(error) });
        send({
          type: "error",
          message:
            error instanceof WriterError && error.retryable
              ? "The site was read, but the model that writes kits is busy right now. Nothing was published. Try again in a minute."
              : "Something went wrong on our side. Nothing was published. Try again in a minute.",
        });
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
