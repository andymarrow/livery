import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// A share card for any page: /og?title=…&kicker=… (1200×630). Livery's
// paper, the mark, a measuring ruler, the page title, the domain.

export const runtime = "edge";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const title = (params.get("title") ?? "Livery").slice(0, 90);
  const kicker = (params.get("kicker") ?? "Design kits for coding agents").slice(0, 40);
  const ticks = Array.from({ length: 66 }, (_, i) => i);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#efeee8", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="52" height="52" viewBox="0 0 24 24">
              <rect width="24" height="24" rx="7" fill="#1a1a17" />
              <path d="M7.5 24 L19 3.2 L24 3.2 L24 7 L14.6 24 Z" fill="#0d7268" />
              <rect x="5.25" y="5.25" width="2.75" height="10.5" rx="1.375" fill="#efeee8" />
            </svg>
            <span style={{ fontSize: 40, fontWeight: 600, color: "#1a1a17", letterSpacing: -1.5 }}>livery</span>
          </div>
          <span style={{ fontSize: 22, color: "#0a5850", background: "#d5e9e4", padding: "8px 18px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 2 }}>{kicker}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: title.length > 48 ? 64 : 80, fontWeight: 600, color: "#1a1a17", letterSpacing: -3, lineHeight: 1.04 }}>{title}</span>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 11, marginTop: 40 }}>
            {ticks.map((i) => (
              <span key={i} style={{ width: 2, height: i % 5 === 0 ? 22 : 11, background: "#c9c6bc" }} />
            ))}
          </div>
          <span style={{ marginTop: 22, fontSize: 28, color: "#55534d" }}>www.livery.site · Any website&apos;s design, as a skill for your coding agent</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=86400, s-maxage=604800" } },
  );
}
