import { describe, expect, it } from "vitest";
import { cleanCurator, combinedName, combinedSlug, sourcesKey } from "@/lib/combine/identity";
import { mergeSources, mergeVoice, toExtraction, type StoredSource } from "@/lib/combine/merge";
import type { Extraction } from "@/lib/extract";
import { generateKit } from "@/lib/generate/kit";
import { measuredAnalysis, voiceProfile } from "@/lib/generate/measured";
import { tasteAnalysis } from "@/lib/generate/taste";
import { fakeExtraction, WEBP } from "../generate/helpers";

function stored(edit: (e: Extraction) => void = () => {}): StoredSource {
  const e = fakeExtraction();
  edit(e);
  const { source, tokens, fonts, icons, components, imagery, items } = e;
  return { source, tokens, fonts, icons, components, imagery, items, voice: voiceProfile({ headings: ["Plan The Week Ahead"], paragraphs: ["You can plan every project in one calm place with your team."], actions: ["Start free"] }) };
}

const otherSite = (url: string, accent: string, display: string) =>
  stored((e) => {
    e.source = { ...e.source, url, finalUrl: url };
    e.tokens.palette = { ...e.tokens.palette, accent, swatches: [{ hex: "#ffffff", share: 0.5, role: "background" }, { hex: accent, share: 0.02, role: "accent" }] };
    e.tokens.typography = { ...e.tokens.typography, families: { ...e.tokens.typography.families, display } };
    e.tokens.radii = [{ px: 24, share: 0.5 }];
  });

describe("identity", () => {
  it("cleans a curator name and refuses an empty one", () => {
    expect(cleanCurator("  Andy  <b>Marrow</b> ")).toEqual({ curator: "Andy bMarrow/b", curatorSlug: "andy-bmarrow-b" });
    expect(cleanCurator("Zoë")).toEqual({ curator: "Zoë", curatorSlug: "zoe" });
    expect(cleanCurator("   ")).toBeNull();
    expect(cleanCurator("!!!")).toBeNull();
    expect(cleanCurator(42)).toBeNull();
  });

  it("keys on kind, curator and link order", () => {
    const urls = ["https://a.com/", "https://b.com/"];
    expect(sourcesKey("taste", "andy", urls)).toBe(sourcesKey("taste", "andy", [...urls]));
    expect(sourcesKey("taste", "andy", urls)).not.toBe(sourcesKey("taste", "andy", [...urls].reverse()));
    expect(sourcesKey("taste", "andy", urls)).not.toBe(sourcesKey("taste", "bo", urls));
    expect(sourcesKey("taste", null, urls)).not.toBe(sourcesKey("site", null, urls));
  });

  it("names and slugs combined kits", () => {
    const key = "abcdef".padEnd(64, "0");
    expect(combinedSlug("site", key, { domain: "linear.app" })).toBe("linear-app-pages-abcdef");
    expect(combinedSlug("taste", key, { curatorSlug: "andy" })).toBe("taste-andy-abcdef");
    expect(combinedSlug("taste", key, { hosts: ["goatrank.lol", "rize.roggy.site"] })).toBe("taste-goatrank-lol-rize-roggy-site-abcdef");
    expect(combinedName("taste", { curator: "Andy" })).toBe("Andy's taste");
    expect(combinedName("taste", { hosts: ["a.com", "b.com", "c.com", "d.com"] })).toBe("A taste across a.com, b.com and 2 more");
    expect(combinedName("site", { domain: "linear.app" })).toBe("linear.app");
  });
});

describe("mergeSources", () => {
  it("keeps the base palette roles and averages what is measured as a share", () => {
    const base = stored();
    const other = otherSite("https://northwind.example/pricing", "#ff7a00", "Inter");
    const { extraction } = mergeSources([base, other], []);
    expect(extraction.tokens.palette.accent).toBe("#0f7c72");
    expect(extraction.tokens.palette.background).toBe("#f6f5f1");
    expect(extraction.tokens.radii).toEqual([
      { px: 12, share: 0.35 },
      { px: 24, share: 0.25 },
    ]);
    expect(extraction.source.url).toBe("https://northwind.example/");
    expect(extraction.text).toEqual({ headings: [], paragraphs: [], actions: [] });
  });

  it("refuses a single source", () => {
    expect(() => mergeSources([stored()], [])).toThrow(/at least two/);
  });

  it("merges voice profiles weighted by how much copy each page had", () => {
    const merged = mergeVoice([stored().voice, undefined, stored().voice]);
    expect(merged?.sampled).toBe(stored().voice!.sampled * 2);
    expect(mergeVoice([undefined])).toBeUndefined();
  });
});

describe("tasteAnalysis", () => {
  const sources = [stored(), otherSite("https://goatrank.lol/", "#ff7a00", "Geist"), otherSite("https://rize.roggy.site/", "#47ab61", "Inter")];
  const { extraction, voice } = mergeSources(sources, []);
  const taste = tasteAnalysis(extraction, sources.map((s) => toExtraction(s)), { label: "Andy's taste", voice });

  it("turns what every site shares into principles", () => {
    const titles = taste.principles.map((p) => p.title);
    expect(titles).toContain("Always light");
    expect(titles).toContain("One accent per project");
    expect(titles).toContain("Flat, drawn edges");
    expect(taste.never.map((n) => n.rule)).toContain("Never use drop shadows for depth.");
  });

  it("gives the range where the sites differ", () => {
    expect(taste.colour[0]).toMatch(/^Backgrounds across the sites/);
    expect(taste.colour.join(" ")).toMatch(/#ff7a00 orange \(goatrank\.lol\)/);
    expect(taste.typography[0]).toMatch(/Display typefaces across the sites: Inter \(northwind\.example\), Geist \(goatrank\.lol\)/);
    expect(taste.summary).toMatch(/^Andy's taste, measured across 3 sites/);
  });

  it("keeps a voice from the stored numbers, with no copy", () => {
    expect(taste.voice.rules.length).toBeGreaterThanOrEqual(2);
    expect(measuredAnalysis(extraction).voice.rules[0]).toMatch(/Too little copy/);
  });
});

describe("a combined kit", () => {
  it("is named for the person, lists its links and carries numbered frames", async () => {
    const sources = [stored(), otherSite("https://goatrank.lol/", "#ff7a00", "Geist")];
    const frames = [
      { name: "desktop", width: 1440, height: 900, webp: WEBP },
      { name: "02-desktop", width: 1440, height: 900, webp: WEBP },
    ];
    const { extraction, voice } = mergeSources(sources, frames);
    const writer = { name: "measurements", write: async () => tasteAnalysis(extraction, sources.map((s) => toExtraction(s)), { label: "Andy's taste", voice }) };
    const kitSources = [
      { url: "https://northwind.example/", slug: "northwind-example", version: 1 },
      { url: "https://goatrank.lol/", slug: "goatrank-lol", version: 2 },
    ];
    const kit = await generateKit(extraction, writer, { slug: "taste-andy-abcdef", version: 1, siteName: "Andy's taste", sources: kitSources });
    const file = (path: string) => kit.files.find((f) => f.path === path)!.content.toString();
    expect(kit.files.map((f) => f.path)).toContain("frames/02-desktop.webp");
    expect(file("SKILL.md")).toMatch(/Apply the Andy's taste design kit/);
    expect(file("rules.md")).toMatch(/^# Andy's taste: design rules/);
    expect(file("rules.md")).toMatch(/1\. https:\/\/northwind\.example\/\n2\. https:\/\/goatrank\.lol\//);
    expect(JSON.parse(file("tokens.json")).sources).toEqual([
      { url: "https://northwind.example/", kit: "northwind-example/v1" },
      { url: "https://goatrank.lol/", kit: "goatrank-lol/v2" },
    ]);
  });
});
