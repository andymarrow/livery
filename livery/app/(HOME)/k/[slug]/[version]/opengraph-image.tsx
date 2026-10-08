import { ImageResponse } from "next/og";
import { parseVersion } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { getKitVersion } from "@/services/kitRead";

// A kit's share card, drawn from its measurements: its palette as swatches,
// its scheme and display font, and its name.

export const alt = "A Livery design kit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 86400;

export default async function KitImage({ params }: { params: Promise<{ slug: string; version: string }> }) {
  const { slug, version } = await params;
  const number = parseVersion(version);
  const view = number && supabaseConfigured() ? await getKitVersion(slug, number).catch(() => null) : null;
  const visible = view && view.visibility === "public" && !view.withdrawnAt ? view : null;
  const p = visible?.tokens?.palette;
  const swatches = [p?.background, p?.surface, p?.text, p?.textMuted, p?.border, p?.accent].filter((c): c is string => Boolean(c)).slice(0, 6);
  const title = visible?.title ?? "Livery design kit";
  const font = visible?.tokens?.typography.families.display;
  const facts = [p ? `${p.scheme} theme` : null, font ? font.replace(/^__|_[0-9a-f]{6}$/g, "") : null, visible ? `v${visible.version}` : null].filter(Boolean).join("  ·  ");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#efeee8", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="46" height="46" viewBox="0 0 24 24">
              <rect width="24" height="24" rx="7" fill="#1a1a17" />
              <path d="M7.5 24 L19 3.2 L24 3.2 L24 7 L14.6 24 Z" fill="#0d7268" />
              <rect x="5.25" y="5.25" width="2.75" height="10.5" rx="1.375" fill="#efeee8" />
            </svg>
            <span style={{ fontSize: 34, fontWeight: 600, color: "#1a1a17", letterSpacing: -1.2 }}>livery</span>
          </div>
          <span style={{ fontSize: 22, color: "#0a5850", background: "#d5e9e4", padding: "8px 18px", borderRadius: 999, letterSpacing: 2, textTransform: "uppercase" }}>{visible?.kind === "taste" ? "Design taste" : "Design kit"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: title.length > 26 ? 68 : 88, fontWeight: 600, color: "#1a1a17", letterSpacing: -3, lineHeight: 1.02 }}>{title}</span>
          <span style={{ marginTop: 14, fontSize: 30, color: "#55534d" }}>Design system for Claude Code, Cursor and Codex</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 0, borderRadius: 18, overflow: "hidden", border: "2px solid #d9d7cf" }}>
            {(swatches.length ? swatches : ["#d9d7cf"]).map((c, i) => (
              <span key={`${c}-${i}`} style={{ width: 96, height: 88, background: c }} />
            ))}
          </div>
          <span style={{ fontSize: 24, color: "#55534d", whiteSpace: "nowrap" }}>{facts}</span>
        </div>
      </div>
    ),
    size,
  );
}
