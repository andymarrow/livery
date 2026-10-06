import { describe, expect, it } from "vitest";
import { assertKitIsClean, generateKit, KitGuardError } from "@/lib/generate/kit";
import { overlaps, sourceIndex } from "@/lib/generate/overlap";
import { analysis, fakeExtraction, scriptedWriter, SOURCE_TEXT, WEBP } from "./helpers";

const meta = { slug: "northwind-example", version: 1 };
const copiedExample = analysis({
  voice: { tone: ["calm"], rules: ["Short sentences."], examples: [{ context: "headline", text: SOURCE_TEXT }] },
});

describe("overlap guard", () => {
  it("finds 8-word runs regardless of case and punctuation", () => {
    const index = sourceIndex([SOURCE_TEXT]);
    expect(overlaps("Honestly: we BUILD calm tools for teams who ship, every day.", index).length).toBeGreaterThan(0);
    expect(overlaps("We build calm tools for small teams.", index)).toHaveLength(0);
  });
});

describe("generateKit", () => {
  it("renders every kit file and a short SKILL.md that opens with the edit rule", async () => {
    const { writer, calls } = scriptedWriter([analysis()]);
    const kit = await generateKit(fakeExtraction(), writer, meta);
    expect(kit.files.map((f) => f.path)).toEqual([
      "SKILL.md", "rules.md", "tokens.json", "fonts.json", "icons.json", "components.md", "layout.md", "motion.md", "voice.md", "licences.md",
      "frames/desktop.webp", "frames/mobile.webp",
    ]);
    const skill = kit.files[0].content.toString();
    expect(skill).toMatch(/^---\nname: livery-northwind-example\ndescription: Apply the northwind\.example design kit \(Livery v1\).*Use only when/);
    expect(skill.split("\n").find((line) => line.startsWith("**"))).toBe("**Never edit a file before step 5. Ask, don't assume.**");
    expect(skill.length).toBeLessThan(6000);
    expect(calls).toHaveLength(1);
    expect(calls[0].images.map((i) => i.label)).toEqual(["desktop, 1440px wide", "mobile, 390px wide"]);
    expect(JSON.parse(kit.files.find((f) => f.path === "tokens.json")!.content.toString()).colour.light.accent).toBe("#0f7c72");
  });

  it("labels licences and always offers the free alternative", async () => {
    const { writer } = scriptedWriter([analysis()]);
    const kit = await generateKit(fakeExtraction(), writer, meta);
    const licences = kit.files.find((f) => f.path === "licences.md")!.content.toString();
    expect(licences).toContain("| font | Söhne | 🔑 Needs a licence | Commercial (Klim) | Inter |");
    expect(licences).toContain("| logo | Site logo | 🎨 Style only |");
  });

  it("regenerates once when the model copies the site, naming the phrases to avoid", async () => {
    const { writer, calls } = scriptedWriter([copiedExample, analysis()]);
    const kit = await generateKit(fakeExtraction(), writer, meta);
    expect(calls).toHaveLength(2);
    expect(calls[1].prompt).toContain("do not reuse these phrases");
    expect(kit.notes[0]).toMatch(/regenerated/);
    expect(kit.analysis.voice.examples).toHaveLength(1);
  });

  it("drops examples and copied strings when the model keeps copying", async () => {
    const { writer } = scriptedWriter([copiedExample, copiedExample]);
    const kit = await generateKit(fakeExtraction(), writer, meta);
    expect(kit.analysis.voice.examples).toEqual([]);
    expect(kit.notes.join(" ")).toMatch(/stripped/);
    const voice = kit.files.find((f) => f.path === "voice.md")!.content.toString();
    expect(voice).not.toContain("ship every single day");
  });
});

describe("assertKitIsClean", () => {
  const index = sourceIndex([SOURCE_TEXT]);
  const file = (path: string, content: string | Buffer) => ({ path, content: Buffer.isBuffer(content) ? content : Buffer.from(content) });

  it("accepts a clean kit", () => {
    expect(() => assertKitIsClean([file("SKILL.md", "# Kit"), file("frames/desktop.webp", WEBP)], index)).not.toThrow();
  });

  it.each([
    ["unknown files", [file("logo.png", "x")]],
    ["font files", [file("rules.md", Buffer.concat([Buffer.from("wOF2"), Buffer.alloc(8)]))]],
    ["embedded SVG", [file("rules.md", "<svg viewBox='0 0 1 1'></svg>")]],
    ["@font-face", [file("tokens.json", "@font-face { src: url(x.woff2) }")]],
    ["data URIs", [file("components.md", "background: url(data:image/png;base64,AAA)")]],
    ["copied text", [file("voice.md", `Example: ${SOURCE_TEXT}`)]],
    ["non-WebP frames", [file("frames/desktop.webp", "PNG")]],
  ])("rejects %s", (_, files) => {
    expect(() => assertKitIsClean(files, index)).toThrow(KitGuardError);
  });
});
