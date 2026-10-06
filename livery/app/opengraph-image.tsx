import { ImageResponse } from "next/og";

export const alt = "Livery: give your app a new livery";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f6f5f1", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="52" height="52" viewBox="0 0 24 24">
            <rect width="24" height="24" rx="7" fill="#151513" />
            <path d="M7.5 24 L19 3.2 L24 3.2 L24 7 L14.6 24 Z" fill="#0f7c72" />
            <rect x="5.25" y="5.25" width="2.75" height="10.5" rx="1.375" fill="#f6f5f1" />
          </svg>
          <span style={{ fontSize: 40, fontWeight: 600, color: "#151513", letterSpacing: -1.5 }}>livery</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 96, fontWeight: 600, color: "#151513", letterSpacing: -4, lineHeight: 1 }}>Give your app</span>
          <span style={{ fontSize: 96, fontWeight: 600, color: "#151513", letterSpacing: -4, lineHeight: 1.05, display: "flex" }}>
            a new&nbsp;<span style={{ color: "#0b5d55", background: "#d7ece8", padding: "0 12px", borderRadius: 12 }}>livery</span>.
          </span>
          <span style={{ marginTop: 28, fontSize: 30, color: "#5c5a54" }}>Any website&apos;s design, as a skill for your coding agent.</span>
        </div>
      </div>
    ),
    size,
  );
}
