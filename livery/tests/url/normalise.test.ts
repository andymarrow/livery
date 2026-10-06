import { describe, expect, it } from "vitest";
import { normaliseTarget, toSlug } from "@/lib/url/normalise";

describe("normaliseTarget", () => {
  it.each([
    ["stripe.com", "https://stripe.com/", "stripe-com"],
    ["https:/stripe.com/pricing", "https://stripe.com/pricing", "stripe-com-pricing"],
    ["https://www.Linear.app/features/?utm_source=x#top", "https://linear.app/features", "linear-app-features"],
    ["http://rize.roggy.site", "https://rize.roggy.site/", "rize-roggy-site"],
    ["https%3A%2F%2Fvercel.com%2Fdesign", "https://vercel.com/design", "vercel-com-design"],
    ["example.com//a//b/", "https://example.com/a/b", "example-com-a-b"],
    ["bücher.de", "https://xn--bcher-kva.de/", "xn-bcher-kva-de"],
  ])("%s", (input, sourceUrl, slug) => {
    const result = normaliseTarget(input);
    expect(result).toMatchObject({ ok: true, value: { sourceUrl, slug } });
  });

  it.each([
    "localhost",
    "http://localhost:3000",
    "127.0.0.1",
    "http://[::1]/",
    "169.254.169.254",
    "https://user:pass@example.com",
    "https://example.com:8443",
    "ftp://example.com",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "not a url",
    "intranet",
  ])("refuses %s", (input) => {
    expect(normaliseTarget(input)).toMatchObject({ ok: false, reason: "unsafe_url" });
  });

  it("keeps long slugs bounded and unique", () => {
    const long = toSlug("example.com", `/${"a".repeat(80)}/${"b".repeat(80)}`);
    expect(long.length).toBeLessThanOrEqual(100);
    expect(long).toMatch(/-[0-9a-f]{8}$/);
    expect(long).not.toBe(toSlug("example.com", `/${"a".repeat(80)}/${"c".repeat(80)}`));
  });
});
