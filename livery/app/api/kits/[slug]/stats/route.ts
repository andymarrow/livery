import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isBot, networkOf, VISITOR_COOKIE, visitorOf } from "@/lib/stats";
import { getAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { getStats, hasLiked, kitIdBySlug, recordEvent, removeLike } from "@/services/stats";

export const dynamic = "force-dynamic";

const YEAR = 60 * 60 * 24 * 365;

// Counts a view or a like for one kit, once per person (see lib/stats.ts),
// and answers with the totals and whether this person likes it.
async function handle(request: NextRequest, ctx: RouteContext<"/api/kits/[slug]/stats">, action: "read" | "view" | "like" | "unlike") {
  if (!supabaseConfigured() || !process.env.IP_HASH_SECRET) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const { slug } = await ctx.params;
  const kitId = await kitIdBySlug(slug);
  if (!kitId) return NextResponse.json({ error: "not found" }, { status: 404 });

  const network = networkOf(request.headers);
  const { visitor, fresh } = visitorOf(request.headers, request.cookies.get(VISITOR_COOKIE)?.value);

  if (action !== "read") {
    // Only this site's own pages may count; other sites and scripts can't.
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.nextUrl.host) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { data: rate } = await getAdminClient().rpc("bump_rate", { p_key: `stats:${network}`, p_window_seconds: 3600, p_max: 300 });
    const allowed = rate?.[0]?.allowed ?? true;
    if (allowed && !isBot(request.headers)) {
      try {
        if (action === "unlike") await removeLike(kitId, visitor, network);
        else await recordEvent(kitId, action, visitor, network);
      } catch (error) {
        logger.warn("stats.record_failed", { slug, action, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const [stats, liked] = await Promise.all([getStats(kitId), hasLiked(kitId, visitor, network)]);
  const response = NextResponse.json({ ...stats, liked }, { headers: { "cache-control": "no-store" } });
  if (fresh) response.cookies.set(VISITOR_COOKIE, fresh, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: YEAR });
  return response;
}

export const GET = (request: NextRequest, ctx: RouteContext<"/api/kits/[slug]/stats">) => handle(request, ctx, "read");

export async function POST(request: NextRequest, ctx: RouteContext<"/api/kits/[slug]/stats">) {
  const body = (await request.json().catch(() => null)) as { kind?: unknown } | null;
  if (body?.kind !== "view" && body?.kind !== "like") return NextResponse.json({ error: "kind must be view or like" }, { status: 400 });
  return handle(request, ctx, body.kind);
}

export const DELETE = (request: NextRequest, ctx: RouteContext<"/api/kits/[slug]/stats">) => handle(request, ctx, "unlike");
