import { describe, expect, it } from "vitest";
import { cdpEndpoint, WEBGL_ARGS } from "@/lib/browser";

describe("cdpEndpoint", () => {
  it.each([
    ["https://production-sfo.browserless.io/screenshot?token=abc", "wss://production-sfo.browserless.io/?token=abc"],
    ["https://production-sfo.browserless.io?token=abc", "wss://production-sfo.browserless.io/?token=abc"],
    ["wss://production-lon.browserless.io?token=abc", "wss://production-lon.browserless.io/?token=abc"],
    ["ws://localhost:3000/chromium?token=abc", "ws://localhost:3000/chromium?token=abc"],
    ["http://my-box:9222/content", "ws://my-box:9222/"],
  ])("%s", (input, expected) => {
    const url = new URL(cdpEndpoint(input));
    url.searchParams.delete("launch");
    expect(url.toString()).toBe(expected);
  });

  it("turns on software WebGL, unless launch options are set by hand", () => {
    const launch = new URL(cdpEndpoint("wss://production-lon.browserless.io?token=abc")).searchParams.get("launch");
    expect(JSON.parse(launch ?? "{}").args).toEqual(WEBGL_ARGS);
    const own = new URL(cdpEndpoint('wss://x.io?token=a&launch={"headless":false}')).searchParams.get("launch");
    expect(own).toBe('{"headless":false}');
  });
});
