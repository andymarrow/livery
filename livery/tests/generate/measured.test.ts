import { describe, expect, it } from "vitest";
import { AnalysisSchema } from "@/lib/generate/analysis";
import { generateKit } from "@/lib/generate/kit";
import { measuredAnalysis, measuredWriter } from "@/lib/generate/measured";
import { fakeExtraction } from "./helpers";

describe("measuredAnalysis", () => {
  it("produces a valid analysis grounded in the measurements", () => {
    const e = fakeExtraction();
    const a = measuredAnalysis(e);
    expect(AnalysisSchema.safeParse(a).success).toBe(true);
    const all = JSON.stringify(a);
    expect(all).toContain("#0f7c72"); // the accent
    expect(all).toContain("8px grid"); // the spacing base
    expect(a.never.map((n) => n.rule)).toContain("Never use drop shadows for depth."); // no shadows measured
    expect(a.summary).toMatch(/^A light interface/);
  });

  it("switches rules when the measurements change", () => {
    const e = fakeExtraction();
    e.tokens.shadows = [{ value: "rgba(0, 0, 0, 0.1) 0px 4px 12px 0px", share: 0.2, tinted: false }];
    e.tokens.palette = { ...e.tokens.palette, accent: null, monochrome: true, swatches: e.tokens.palette.swatches.filter((s) => s.role !== "accent") };
    const a = measuredAnalysis(e);
    expect(a.principles.map((p) => p.title)).toContain("Contrast, not colour");
    expect(a.principles.map((p) => p.title)).toContain("Soft, neutral depth");
    expect(a.never.map((n) => n.rule)).toContain("Never tint shadows with colour.");
  });

  it("reads voice from the copy without quoting it", () => {
    const e = fakeExtraction();
    e.text = {
      headings: ["Plan your week", "Ship calmer software", "Built for teams", "Your work, in one place"],
      paragraphs: ["You plan the work. We keep it moving.", "Your team sees every change as it happens, so nothing slips."],
      actions: ["Start free", "Book a demo", "See pricing"],
    };
    const v = measuredAnalysis(e).voice;
    expect(v.tone).toContain("direct");
    expect(v.rules.join(" ")).toMatch(/sentence case/);
    expect(v.rules.join(" ")).toMatch(/verb first/);
    for (const example of v.examples) for (const source of [...e.text.headings, ...e.text.paragraphs]) expect(example.text).not.toBe(source);
  });

  it("builds a complete, clean kit with no model", async () => {
    const e = fakeExtraction();
    const kit = await generateKit(e, measuredWriter(e), { slug: "northwind-example", version: 1 });
    expect(kit.files.map((f) => f.path)).toContain("rules.md");
    expect(kit.notes).toEqual([]);
    expect(kit.files.find((f) => f.path === "rules.md")!.content.toString()).toContain("## Never");
  });
});
