import { lookup } from "node:dns/promises";
import { describe, expect, it } from "vitest";
import { safeFetch } from "@/lib/url/ssrf";

const dnsWorks = await lookup("example.com").then(() => true, () => false);

describe.skipIf(!dnsWorks)("safeFetch bodies", () => {
  it("returns decoded text from a compressed response", async () => {
    const result = await safeFetch(new URL("https://www.google.com/robots.txt"), { accept: "text/plain" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.response.headers.get("content-encoding")).toBeNull();
      expect(await result.value.response.text()).toMatch(/User-agent:/i);
    }
  });

  it("follows redirects and reports the final URL", async () => {
    // google.com answers 301 -> www.google.com
    const result = await safeFetch(new URL("https://google.com/"), { maxRedirects: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.finalUrl.hostname).toBe("www.google.com");
      expect(result.value.redirects).toBeGreaterThanOrEqual(1);
      await result.value.response.body?.cancel();
    }
  });
});
