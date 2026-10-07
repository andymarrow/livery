import { withKitVersion, immutableFile } from "@/lib/kit/serve";

export async function GET(request: Request, ctx: RouteContext<"/k/[slug]/[version]/SKILL.md">) {
  const { slug, version } = await ctx.params;
  return withKitVersion(slug, version, (view) => immutableFile(view.skillMd, "text/markdown; charset=utf-8", undefined, view.visibility === "private"), request);
}
