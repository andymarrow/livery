import { describe, expect, it } from "vitest";
import { deniedCategory, isSensitivePath } from "@/lib/url/blocklist";

describe("deniedCategory", () => {
  it.each([
    ["chase.com", "bank"],
    ["secure.chase.com", "bank"],
    ["paypal.com", "payments"],
    ["checkout.stripe.com", "payments"],
    ["coinbase.com", "crypto"],
    ["accounts.google.com", "identity"],
    ["appleid.apple.com", "identity"],
    ["irs.gov", "government"],
    ["anything.gov", "government"],
    ["service.gov.uk", "government"],
    ["portal.gov.br", "government"],
    ["mybank.bank", "bank"],
  ])("%s -> %s", (host, category) => expect(deniedCategory(host)).toBe(category));

  it.each(["stripe.com", "linear.app", "google.com", "apple.com", "rize.roggy.site", "govtech.com", "bankrate.com"])(
    "allows %s",
    (host) => expect(deniedCategory(host)).toBeNull(),
  );
});

describe("isSensitivePath", () => {
  it.each(["/login", "/sign-in", "/signin/", "/en/login", "/en-us/checkout", "/account/settings", "/billing", "/auth/callback", "/sso"])(
    "flags %s",
    (path) => expect(isSensitivePath(path)).toBe(true),
  );
  it.each(["/", "/pricing", "/blog/how-we-login", "/features/payments-api", "/accounts-team"])("allows %s", (path) =>
    expect(isSensitivePath(path)).toBe(false),
  );
});
