import { skillNameFor } from "@/lib/generate/flow";
import { withKitVersion, immutableFile } from "@/lib/kit/serve";
import { downloadArtefact } from "@/services/kitRead";

export async function GET(_request: Request, ctx: RouteContext<"/k/[slug]/[version]/kit.tar.gz">) {
  const { slug, version } = await ctx.params;
  return withKitVersion(slug, version, async (view) => {
    const archive = view.tarPath ? await downloadArtefact(view.tarPath) : null;
    if (!archive) return new Response("Archive unavailable", { status: 503 });
    return immutableFile(Buffer.from(archive), "application/gzip", `${skillNameFor(view.slug)}-v${view.version}.tar.gz`);
  });
}
