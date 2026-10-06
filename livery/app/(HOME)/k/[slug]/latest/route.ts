import { kitPath } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { latestVersionBySlug } from "@/services/kitRead";

export const dynamic = "force-dynamic";

// Convenience only: copy-paste prompts always pin an exact version.
export async function GET(request: Request, ctx: RouteContext<"/k/[slug]/latest">) {
  if (!supabaseConfigured()) return new Response("Livery is not configured yet", { status: 503 });
  const { slug } = await ctx.params;
  const version = await latestVersionBySlug(slug);
  if (!version) return new Response("Not found", { status: 404 });
  return new Response(null, { status: 302, headers: { location: new URL(kitPath(slug, version), request.url).toString(), "cache-control": "no-store" } });
}
