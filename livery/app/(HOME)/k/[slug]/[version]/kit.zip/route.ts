import { skillNameFor } from "@/lib/generate/flow";
import { withKitVersion, immutableFile } from "@/lib/kit/serve";
import { downloadArtefact } from "@/services/kitRead";

export async function GET(_request: Request, ctx: RouteContext<"/k/[slug]/[version]/kit.zip">) {
  const { slug, version } = await ctx.params;
  return withKitVersion(slug, version, async (view) => {
    const archive = view.zipPath ? await downloadArtefact(view.zipPath) : null;
    if (!archive) return new Response("Archive unavailable", { status: 503 });
    return immutableFile(Buffer.from(archive), "application/zip", `${skillNameFor(view.slug)}-v${view.version}.zip`);
  });
}
