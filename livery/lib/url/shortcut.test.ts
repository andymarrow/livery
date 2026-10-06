import { describe, expect, it } from "vitest";
import { toShortcut } from "./shortcut";

describe("toShortcut", () => {
  it.each([
    ["linear.app", "linear.app"],
    ["https://linear.app/", "linear.app"],
    ["  https://www.Linear.app/features?ref=x#top ", "linear.app/features"],
    ["http://rize.roggy.site", "rize.roggy.site"],
    ["livery.site/goatrank.lol", "goatrank.lol"],
    ["https://livery.site/https://vercel.com/design", "vercel.com/design"],
  ])("%s -> %s", (input, expected) => {
    expect(toShortcut(input)).toMatchObject({ ok: true, path: expected });
  });

  it.each(["", "   "])("rejects empty input %j", (input) => {
    expect(toShortcut(input)).toEqual({ ok: false, reason: "empty" });
  });

  it.each([
    "localhost",
    "http://localhost:3000",
    "192.168.0.1",
    "ftp://example.com",
    "javascript:alert(1)",
    "https://user:pass@example.com",
    "not a url",
    "example",
  ])("rejects %s", (input) => {
    expect(toShortcut(input)).toMatchObject({ ok: false });
  });
});
