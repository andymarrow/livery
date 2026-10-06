import { describe, expect, it } from "vitest";
import { isAllowedByRobots } from "@/lib/url/robots";

describe("isAllowedByRobots", () => {
  it("allows everything with an empty file or empty disallow", () => {
    expect(isAllowedByRobots("", "LiveryBot", "/")).toBe(true);
    expect(isAllowedByRobots("User-agent: *\nDisallow:", "LiveryBot", "/x")).toBe(true);
  });

  it("follows the * group when there is no LiveryBot group", () => {
    const txt = "User-agent: *\nDisallow: /private\n";
    expect(isAllowedByRobots(txt, "LiveryBot", "/private/page")).toBe(false);
    expect(isAllowedByRobots(txt, "LiveryBot", "/")).toBe(true);
  });

  it("prefers a group aimed at LiveryBot over *", () => {
    const txt = "User-agent: *\nDisallow: /\n\nUser-agent: LiveryBot\nAllow: /\n";
    expect(isAllowedByRobots(txt, "LiveryBot", "/anything")).toBe(true);
    const blocked = "User-agent: *\nAllow: /\n\nUser-agent: liverybot\nDisallow: /\n";
    expect(isAllowedByRobots(blocked, "LiveryBot", "/")).toBe(false);
  });

  it("uses the longest match, with allow winning ties, and supports * and $", () => {
    const txt = "User-agent: *\nDisallow: /docs\nAllow: /docs/public\nDisallow: /*.pdf$\n";
    expect(isAllowedByRobots(txt, "LiveryBot", "/docs/secret")).toBe(false);
    expect(isAllowedByRobots(txt, "LiveryBot", "/docs/public/page")).toBe(true);
    expect(isAllowedByRobots(txt, "LiveryBot", "/files/a.pdf")).toBe(false);
    expect(isAllowedByRobots(txt, "LiveryBot", "/files/a.pdf?x=1")).toBe(true);
    expect(isAllowedByRobots("User-agent: *\nDisallow: /a\nAllow: /a\n", "LiveryBot", "/a")).toBe(true);
  });

  it("groups consecutive user-agent lines and ignores comments", () => {
    const txt = "# hello\nUser-agent: GPTBot\nUser-agent: LiveryBot # us\nDisallow: /\n";
    expect(isAllowedByRobots(txt, "LiveryBot", "/")).toBe(false);
  });
});
