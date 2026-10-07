import { after } from "next/server";
import { countDownload, VISITOR_COOKIE } from "@/lib/stats";
import { skillNameFor } from "@/lib/generate/flow";
import { cookieValue, immutableFile, uncachedAtCdn, withKitVersion } from "@/lib/kit/serve";
import { downloadArtefact } from "@/services/kitRead";

export async function GET(request: Request, ctx: RouteContext<"/k/[slug]/[version]/kit.tar.gz">) {
  const { slug, version } = await ctx.params;
  return withKitVersion(slug, version, async (view) => {
    const archive = view.tarPath ? await downloadArtefact(view.tarPath) : null;
    if (!archive) return new Response("Archive unavailable", { status: 503 });
    if (view.visibility === "public") after(() => countDownload(request.headers, cookieValue(request.headers, VISITOR_COOKIE), view.kitId));
    return uncachedAtCdn(immutableFile(Buffer.from(archive), "application/gzip", `${skillNameFor(view.slug)}-v${view.version}.tar.gz`, view.visibility === "private"));
  }, request);
}
