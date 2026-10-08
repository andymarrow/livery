import { llmsTxt } from "@/lib/seo/llms";

export const revalidate = 3600;

export async function GET() {
  return new Response(await llmsTxt(), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
