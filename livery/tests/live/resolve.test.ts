// Opt-in end-to-end: LIVE=1 SITES=rize.roggy.site npx vitest run tests/live/resolve.test.ts
// Uses .env: real Supabase, real Gemini, local Chrome. Builds and publishes kits.
import { describe, expect, it } from "vitest";

if (process.env.LIVE) {
  try {
    process.loadEnvFile(".env");
  } catch {}
}

const SITES = (process.env.SITES ?? "rize.roggy.site").split(",");

describe.skipIf(!process.env.LIVE)("resolveKit end to end", { timeout: 400_000 }, () => {
  it.each(SITES)("publishes a kit for %s", async (site) => {
    const { resolveKit } = await import("@/controllers/buildKit");
    const started = Date.now();
    const outcome = await resolveKit(site, {
      ip: "127.0.0.1",
      onProgress: (stage, detail) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${stage}${detail ? ` (${detail})` : ""}`),
    });
    console.log("OUTCOME", JSON.stringify(outcome));
    expect(outcome.status).toBe("ready");
  });
});
