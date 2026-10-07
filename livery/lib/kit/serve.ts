import "server-only";
import { IMMUTABLE, markdown } from "@/lib/http";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { getKitVersion, type KitVersionView } from "@/services/kitRead";
import { parseVersion } from "./urls";
import { timingSafeEqual } from "node:crypto";

const sameSecret = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Shared lookup for /k/{slug}/v{n}/* files. Withdrawn versions answer 410 and
 * never different content; unknown ones 404.
 */
export async function withKitVersion(slug: string, versionSegment: string, respond: (view: KitVersionView) => Promise<Response> | Response, request?: Request) {
  if (!supabaseConfigured()) return new Response("Livery is not configured yet", { status: 503 });
  const version = parseVersion(versionSegment);
  if (!version) return new Response("Not found", { status: 404 });
  const view = await getKitVersion(slug, version);
  if (!view) return new Response("Not found", { status: 404 });
  // A private version's files need its key (the owner's install link carries it); without it, it doesn't exist.
  if (view.visibility === "private") {
    const key = request ? new URL(request.url).searchParams.get("key") : null;
    if (!key || !view.privateKey || !sameSecret(key, view.privateKey)) return new Response("Not found", { status: 404 });
  }
  if (view.status === "withdrawn") {
    return markdown(`# Withdrawn by the site owner\n\nVersion ${version} of this kit was withdrawn on ${view.withdrawnAt?.slice(0, 10)} and is no longer available.\n`, {
      status: 410,
      headers: { "cache-control": "public, max-age=3600" },
    });
  }
  return respond(view);
}

export function immutableFile(body: BodyInit, contentType: string, filename?: string, isPrivate = false) {
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "cache-control": isPrivate ? "private, no-store" : IMMUTABLE,
      ...(filename ? { "content-disposition": `attachment; filename="${filename}"` } : {}),
    },
  });
}

/** Browsers may keep the file, but the CDN must not: every download reaches the counter. */
export function uncachedAtCdn(response: Response) {
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  return response;
}

export function cookieValue(headers: Headers, name: string) {
  const match = (headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1];
}
