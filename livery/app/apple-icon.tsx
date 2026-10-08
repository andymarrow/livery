import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The mark on a solid tile, for home screens and bookmarks.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#1a1a17" }}>
        <svg width="180" height="180" viewBox="0 0 24 24">
          <rect width="24" height="24" fill="#1a1a17" />
          <path d="M7.5 24 L19 3.2 L24 3.2 L24 7 L14.6 24 Z" fill="#0d7268" />
          <rect x="5.25" y="5.25" width="2.75" height="10.5" rx="1.375" fill="#efeee8" />
        </svg>
      </div>
    ),
    size,
  );
}
