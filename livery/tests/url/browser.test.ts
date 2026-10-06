import { describe, expect, it } from "vitest";
import { cdpEndpoint } from "@/lib/browser";

describe("cdpEndpoint", () => {
  it.each([
    ["https://production-sfo.browserless.io/screenshot?token=abc", "wss://production-sfo.browserless.io/?token=abc"],
    ["https://production-sfo.browserless.io?token=abc", "wss://production-sfo.browserless.io/?token=abc"],
    ["wss://production-lon.browserless.io?token=abc", "wss://production-lon.browserless.io/?token=abc"],
    ["ws://localhost:3000/chromium?token=abc", "ws://localhost:3000/chromium?token=abc"],
    ["http://my-box:9222/content", "ws://my-box:9222/"],
  ])("%s", (input, expected) => expect(cdpEndpoint(input)).toBe(expected));
});
