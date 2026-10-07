import { withKitVersion, immutableFile } from "@/lib/kit/serve";

export async function GET(request: Request, ctx: RouteContext<"/k/[slug]/[version]/manifest.json">) {
  const { slug, version } = await ctx.params;
  return withKitVersion(slug, version, (view) => immutableFile(JSON.stringify(view.manifest, null, 2), "application/json; charset=utf-8", undefined, view.visibility === "private"), request);
}
