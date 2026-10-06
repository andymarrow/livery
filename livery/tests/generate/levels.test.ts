import { describe, expect, it } from "vitest";
import { assertKitIsClean, generateKit, KitGuardError } from "@/lib/generate/kit";
import { sourceIndex } from "@/lib/generate/overlap";
import { analysis, fakeExtraction, scriptedWriter, SOURCE_TEXT } from "./helpers";

const paths = (files: { path: string }[]) => files.map((f) => f.path);

describe("level-aware kits", () => {
  it("leaves out the files of levels the owner didn't grant", async () => {
    const { writer } = scriptedWriter([analysis()]);
    const kit = await generateKit(fakeExtraction(), writer, { slug: "x", version: 1, levels: [1, 2] });
    expect(paths(kit.files)).not.toContain("motion.md");
    expect(paths(kit.files)).not.toContain("voice.md");
    expect(paths(kit.files)).toContain("tokens.json");
    expect(kit.files[0].content.toString()).not.toContain("`voice.md`");
  });

  it("adds the owner's rules at level 4 and points SKILL.md at them", async () => {
    const { writer } = scriptedWriter([analysis()]);
    const kit = await generateKit(fakeExtraction(), writer, { slug: "x", version: 1, levels: [1, 2, 3, 4], ownerRules: "# Our rules\n\n- Never use glow." });
    const owner = kit.files.find((f) => f.path === "owner-rules.md")!.content.toString();
    expect(owner).toContain("Never use glow.");
    expect(kit.files[0].content.toString()).toContain("they outrank `rules.md`");
    expect(kit.files.find((f) => f.path === "rules.md")!.content.toString()).toContain("owner-rules.md");
  });

  it("includes owner-approved assets only at level 5 and records the terms", async () => {
    const svg = { path: "assets/illustrations/illustration-01.svg", content: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>') };
    const meta = { slug: "x", version: 1, assets: [svg], terms: { licence: "CC-BY-4.0", commercial: true } };
    const without = await generateKit(fakeExtraction(), scriptedWriter([analysis()]).writer, { ...meta, levels: [1, 2, 3] });
    expect(paths(without.files)).not.toContain(svg.path);
    const withAssets = await generateKit(fakeExtraction(), scriptedWriter([analysis()]).writer, { ...meta, levels: [1, 2, 3, 5] });
    expect(paths(withAssets.files)).toContain(svg.path);
    expect(withAssets.files.find((f) => f.path === "licences.md")!.content.toString()).toContain("**CC-BY-4.0**, commercial use allowed");
  });

  it("allows real quotes in voice examples only at level 6", async () => {
    const quoting = analysis({ voice: { tone: ["calm"], rules: ["Short sentences."], examples: [{ context: "headline", text: SOURCE_TEXT }] } });
    const kit = await generateKit(fakeExtraction(), scriptedWriter([quoting]).writer, { slug: "x", version: 1, levels: [1, 2, 3, 6], allowQuotes: true });
    expect(kit.files.find((f) => f.path === "voice.md")!.content.toString()).toContain(SOURCE_TEXT);
    expect(kit.notes).toEqual([]);
  });
});

describe("assertKitIsClean with assets", () => {
  const index = sourceIndex([SOURCE_TEXT]);
  const file = (path: string, content: string | Buffer) => ({ path, content: Buffer.isBuffer(content) ? content : Buffer.from(content) });
  it("accepts clean owner assets", () => {
    expect(() =>
      assertKitIsClean([file("assets/icons/icon-01.svg", "<svg><path/></svg>"), file("assets/photos/photo-01.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))], index),
    ).not.toThrow();
  });
  it.each([
    ["active SVG", file("assets/icons/icon-01.svg", "<svg onload=alert(1)></svg>")],
    ["a mislabelled photo", file("assets/photos/photo-01.jpg", "GIF89a")],
    ["SVG outside assets", file("components.md", "<svg></svg>")],
    ["a logo file", file("assets/logo.svg", "<svg></svg>")],
  ])("rejects %s", (_, f) => expect(() => assertKitIsClean([f], index)).toThrow(KitGuardError));
});
