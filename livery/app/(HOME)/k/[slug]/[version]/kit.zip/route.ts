import { after } from "next/server";
import { countDownload, VISITOR_COOKIE } from "@/lib/stats";
import { skillNameFor } from "@/lib/generate/flow";
import { cookieValue, immutableFile, uncachedAtCdn, withKitVersion } from "@/lib/kit/serve";
import { downloadArtefact } from "@/services/kitRead";

export async function GET(request: Request, ctx: RouteContext<"/k/[slug]/[version]/kit.zip">) {
  const { slug, version } = await ctx.params;
  return withKitVersion(slug, version, async (view) => {
    const archive = view.zipPath ? await downloadArtefact(view.zipPath) : null;
    if (!archive) return new Response("Archive unavailable", { status: 503 });
    after(() => countDownload(request.headers, cookieValue(request.headers, VISITOR_COOKIE), view.kitId));
    return uncachedAtCdn(immutableFile(Buffer.from(archive), "application/zip", `${skillNameFor(view.slug)}-v${view.version}.zip`));
  });
}
