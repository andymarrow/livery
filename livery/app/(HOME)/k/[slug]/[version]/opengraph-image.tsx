import { ImageResponse } from "next/og";
import { parseVersion } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { getKitVersion } from "@/services/kitRead";

export const alt = "A Livery design kit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The kit's own palette as solid bands, with its name. No gradients, ever.
export default async function KitOgImage({ params }: { params: Promise<{ slug: string; version: string }> }) {
  const { slug, version } = await params;
  const number = parseVersion(version);
  const view = number && supabaseConfigured() ? await getKitVersion(slug, number) : null;
  const palette = view?.tokens?.palette;
  const bands = palette ? [palette.background, palette.surface, palette.text, palette.accent, palette.border].filter((c): c is string => Boolean(c)) : ["#efeee8", "#ffffff", "#1a1a17", "#0d7268"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#efeee8", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", height: 300 }}>
          {bands.map((colour, i) => (
            <div key={i} style={{ flexGrow: i === 0 ? 3 : 1, background: colour }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flexGrow: 1, padding: "48px 64px" }}>
          <span style={{ fontSize: 76, fontWeight: 600, color: "#1a1a17", letterSpacing: -3 }}>{view?.domain ?? slug}</span>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#55534d" }}>
            <span>Design kit · v{number ?? 1}</span>
            <span style={{ color: "#0d7268", fontWeight: 600 }}>livery.site</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
