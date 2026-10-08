import type { NextRequest } from "next/server";

// A small badge sites and READMEs can show to link to their Livery kit:
// /k/<slug>/badge.svg (light) or ?theme=dark. Static artwork; the slug only
// decides where the embedding page links, so nothing here touches the database.

export const dynamic = "force-static";

const svg = (dark: boolean) => `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="28" viewBox="0 0 168 28" role="img" aria-label="Design kit on Livery">
  <title>Design kit on Livery</title>
  <rect x="0.5" y="0.5" width="167" height="27" rx="13.5" fill="${dark ? "#141416" : "#f8f7f3"}" stroke="${dark ? "#2a2a2e" : "#dcdad2"}"/>
  <g transform="translate(8 6)">
    <rect width="16" height="16" rx="4.6" fill="${dark ? "#f5f5f4" : "#1a1a17"}"/>
    <path d="M5 16 L12.7 2.1 L16 2.1 L16 4.7 L9.7 16 Z" fill="#0d7268"/>
    <rect x="3.5" y="3.5" width="1.8" height="7" rx="0.9" fill="${dark ? "#141416" : "#f8f7f3"}"/>
  </g>
  <text x="32" y="18.2" font-family="Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif" font-size="11.5" font-weight="500" fill="${dark ? "#a8a8a3" : "#5f5e59"}">Design kit on</text>
  <text x="109" y="18.2" font-family="Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif" font-size="11.5" font-weight="700" fill="${dark ? "#f5f5f4" : "#111111"}">livery</text>
</svg>`;

export function GET(request: NextRequest) {
  const dark = request.nextUrl.searchParams.get("theme") === "dark";
  return new Response(svg(dark), { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=86400, s-maxage=2592000" } });
}
