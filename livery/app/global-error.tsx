"use client";

// Replaces the root layout when it fails, so it can't rely on globals.css.
// Colours follow the OS scheme and match the site's soft skin.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <title>Something went wrong · Livery</title>
        <style>{`
          :root { color-scheme: light dark; --bg: #efeee8; --fg: #1a1a17; --muted: #55534d; --accent: #0d7268; --on: #fff; }
          @media (prefers-color-scheme: dark) { :root { --bg: #161718; --fg: #e6e5e0; --muted: #a3a19b; --accent: #5fd4c2; --on: #052420; } }
          body { background: var(--bg); color: var(--fg); }
        `}</style>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 30, letterSpacing: "-0.03em", margin: 0 }}>Livery hit a snag</h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>Something failed before the page could load. Try again in a moment.</p>
            <button
              onClick={() => retry()}
              style={{ marginTop: 16, height: 40, padding: "0 18px", borderRadius: 12, border: 0, background: "var(--accent)", color: "var(--on)", font: "inherit", fontWeight: 500, cursor: "pointer" }}
            >
              Try again
            </button>
            {error.digest && <p style={{ marginTop: 32, fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--muted)" }}>ref {error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  );
}
