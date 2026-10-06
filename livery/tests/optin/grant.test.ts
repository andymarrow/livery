import { afterEach, describe, expect, it, vi } from "vitest";

// Stand-in for the network: each test decides what each URL answers.
const responses = new Map<string, { status?: number; body?: string; type?: string; finalUrl?: string }>();
vi.mock("@/lib/url/ssrf", () => ({
  safeFetch: vi.fn(async (url: URL) => {
    const hit = responses.get(url.toString());
    if (!hit) return { ok: true, value: { response: new Response("not found", { status: 404 }), finalUrl: url, redirects: 0 } };
    return {
      ok: true,
      value: {
        response: new Response(hit.body ?? "", { status: hit.status ?? 200, headers: { "content-type": hit.type ?? "application/json" } }),
        finalUrl: new URL(hit.finalUrl ?? url.toString()),
        redirects: 0,
      },
    };
  }),
}));

const { grantCovers, isOptOut, lookupGrant, sameSite } = await import("@/lib/optin/grant");

const valid = {
  version: 1,
  owner: { name: "Roggy Studio", contact: "design@roggy.site" },
  allow: { levels: [1, 2, 3, 4, 5], assets: ["illustrations"], quote_text: false },
  paths: { include: ["/", "/work/*"], exclude: ["/admin/*"] },
  terms: { licence: "CC-BY-4.0", commercial: true, attribution: "Design by Roggy Studio" },
  rules: "https://roggy.site/design-rules.md",
  updated: "2026-10-06",
};
const WELL_KNOWN = "https://roggy.site/.well-known/livery.json";

afterEach(() => responses.clear());

describe("lookupGrant", () => {
  it("accepts a valid file and hashes its exact bytes", async () => {
    responses.set(WELL_KNOWN, { body: JSON.stringify(valid) });
    const { file } = await lookupGrant("roggy.site");
    expect(file?.grant.allow.levels).toEqual([1, 2, 3, 4, 5]);
    expect(file?.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([
    ["broken JSON", { body: "{ nope" }, /not valid JSON/],
    ["a logo grant (not expressible)", { body: JSON.stringify({ ...valid, allow: { ...valid.allow, assets: ["logo"] } }) }, /invalid/],
    ["unknown fields", { body: JSON.stringify({ ...valid, extra: true }) }, /invalid/],
    ["a file over 32 KB", { body: JSON.stringify({ ...valid, owner: { name: "x", contact: "y".repeat(40_000) } }) }, /32 KB|invalid/],
    ["a redirect to another host", { body: JSON.stringify(valid), finalUrl: "https://evil.example/livery.json" }, /same host/],
  ])("rejects %s", async (_, response, detail) => {
    responses.set(WELL_KNOWN, response);
    const result = await lookupGrant("roggy.site");
    expect(result.file).toBeNull();
    expect(result.detail).toMatch(detail);
  });

  it("treats the apex and www as the same host", async () => {
    responses.set(WELL_KNOWN, { body: JSON.stringify(valid), finalUrl: "https://www.roggy.site/.well-known/livery.json" });
    expect((await lookupGrant("roggy.site")).file).not.toBeNull();
    expect(sameSite("www.roggy.site", "roggy.site")).toBe(true);
    expect(sameSite("blog.roggy.site", "roggy.site")).toBe(false);
  });

  it("falls back to <link rel=\"livery\"> in the homepage head", async () => {
    responses.set("https://roggy.site/", { type: "text/html", body: '<html><head><link rel="livery" href="/files/livery.json"></head><body></body></html>' });
    responses.set("https://roggy.site/files/livery.json", { body: JSON.stringify(valid) });
    const { file } = await lookupGrant("roggy.site");
    expect(file?.source).toBe("/files/livery.json");
  });

  it("ignores a link tag that points at another host", async () => {
    responses.set("https://roggy.site/", { type: "text/html", body: '<head><link rel="livery" href="https://other.site/livery.json"></head>' });
    expect((await lookupGrant("roggy.site")).file).toBeNull();
  });
});

describe("grantCovers", () => {
  const grant = valid as never;
  it.each([
    ["/", true],
    ["/work/case-study", true],
    ["/pricing", false],
    ["/admin/users", false],
  ])("%s -> %s", (path, covered) => expect(grantCovers(grant, path)).toBe(covered));

  it("covers every page when no paths are given", () => {
    expect(grantCovers({ ...valid, paths: undefined } as never, "/anything/here")).toBe(true);
  });

  it("recognises an opt-out", () => {
    expect(isOptOut({ ...valid, allow: { levels: [], assets: [], quote_text: false } } as never)).toBe(true);
  });
});
