import type { NextRequest } from "next/server";
import { EXTRACTOR_VERSION } from "@/constants/constants";
import { kitPath } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { normaliseTarget } from "@/lib/url/normalise";
import { findReadyKit } from "@/services/kits";

export const dynamic = "force-dynamic";

/** Polled by the build page while someone else's build of the same URL runs. */
export async function GET(request: NextRequest) {
  if (!supabaseConfigured()) return Response.json({ ready: false }, { status: 503 });
  const target = normaliseTarget(request.nextUrl.searchParams.get("url") ?? "");
  if (!target.ok) return Response.json({ ready: false, reason: target.reason }, { status: 400 });
  const kit = await findReadyKit(target.value.sourceUrl, EXTRACTOR_VERSION);
  return Response.json(kit ? { ready: true, path: kitPath(kit.slug, kit.version) } : { ready: false }, { headers: { "cache-control": "no-store" } });
}
