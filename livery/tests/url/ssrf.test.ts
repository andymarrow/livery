import { lookup } from "node:dns/promises";
import { describe, expect, it } from "vitest";
import { isPublicAddress, isUnsafeHostname, resolvesToPublicAddresses, safeFetch } from "@/lib/url/ssrf";

const dnsWorks = await lookup("example.com").then(
  () => true,
  () => false,
);

describe("isPublicAddress", () => {
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("allows %s", (ip) => expect(isPublicAddress(ip)).toBe(true));
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "2002:7f00:1::1",
    "not-an-ip",
  ])("refuses %s", (ip) => expect(isPublicAddress(ip)).toBe(false));
});

describe("isUnsafeHostname", () => {
  it.each(["localhost", "api.localhost", "printer.local", "metadata.google.internal", "127.0.0.1", "[::1]", "10.0.0.8"])(
    "refuses %s",
    (host) => expect(isUnsafeHostname(host)).toBe(true),
  );
  it.each(["example.com", "8.8.8.8"])("allows %s", (host) => expect(isUnsafeHostname(host)).toBe(false));
});

describe("safeFetch", () => {
  it("refuses plain http", async () => {
    expect(await safeFetch(new URL("http://example.com/"))).toMatchObject({ ok: false, reason: "unsafe_url" });
  });

  it("refuses private hosts before connecting", async () => {
    for (const url of ["https://localhost/", "https://127.0.0.1/", "https://169.254.169.254/latest/meta-data/", "https://[::1]/"]) {
      expect(await safeFetch(new URL(url))).toMatchObject({ ok: false, reason: "unsafe_url" });
    }
  });

  it.skipIf(!dnsWorks)("refuses public names that resolve to private addresses (rebinding)", async () => {
    // localtest.me is a public DNS name that points at 127.0.0.1.
    expect(await resolvesToPublicAddresses("localtest.me")).toBe(false);
    expect(await safeFetch(new URL("https://localtest.me/"))).toMatchObject({ ok: false, reason: "unsafe_url" });
  });

  it.skipIf(!dnsWorks)("fetches a real public page", async () => {
    const result = await safeFetch(new URL("https://example.com/"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.response.status).toBe(200);
      await result.value.response.body?.cancel();
    }
  });
});
