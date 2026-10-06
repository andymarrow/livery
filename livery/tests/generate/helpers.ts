import type { Extraction } from "@/lib/extract";
import type { Analysis } from "@/lib/generate/analysis";
import type { DesignWriter, WriterInput } from "@/lib/generate/writer";

// 1x1 WebP, enough to pass frame checks.
export const WEBP = Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64");

export const SOURCE_TEXT = "We build calm tools for teams who ship every single day without drama at all";

export function fakeExtraction(): Extraction {
  const palette = {
    scheme: "light" as const, background: "#f6f5f1", surface: "#ffffff", surfaceAlt: null, text: "#151513", textMuted: "#5c5a54",
    border: "#e4e2dc", accent: "#0f7c72", onAccent: "#ffffff", monochrome: false, swatches: [{ hex: "#f6f5f1", share: 0.6, role: "background" }],
  };
  return {
    source: { url: "https://northwind.example/", finalUrl: "https://northwind.example/", extractedAt: "2026-10-06T00:00:00.000Z", extractorVersion: 1 },
    tokens: {
      palette,
      alternatePalette: null,
      typography: { families: { body: "Inter", display: "Inter", mono: null, stacks: {} }, scale: [{ name: "body", sizePx: 16, weight: 400, lineHeight: 1.5, letterSpacingEm: 0, roles: ["body"], share: 0.6 }], weights: [400, 600] },
      spacing: { base: 8, values: [8, 16, 24, 32], fit: 0.9 },
      radii: [{ px: 12, share: 0.7 }],
      shadows: [],
      borderWidths: ["1px"],
      breakpoints: [768, 1024],
      motion: { durationsMs: [{ ms: 150, share: 1 }], easings: [{ value: "ease-out", share: 1 }], properties: ["color"], keyframes: [], animated: true },
      layout: { containerPx: 1152, sectionPaddingPx: 96, header: { heightPx: 64, sticky: true, bordered: true }, gridColumns: [3], flexGapsPx: [8] },
      rootVariables: {},
    },
    fonts: [{ family: "Inter", roles: ["body", "display"], licence: "free", licenceName: "OFL", source: "google-fonts", install: "npm i @fontsource-variable/inter", alternative: null, note: "" }],
    icons: { library: { name: "Lucide", package: "lucide-react", licence: "free", licenceName: "ISC", alternative: null }, confidence: "class-names", names: ["arrow-right"], style: { sizePx: 16, strokeWidth: 2, linecap: "round", filled: false, viewBox: "0 0 24 24" }, customCount: 0, logoCount: 1 },
    components: [],
    imagery: { images: 2, backgroundImages: 0, videos: 0, roundedImages: 2, averageImageRadius: 16, illustrations: 0 },
    items: [
      { kind: "font", name: "Inter", source: "google-fonts", licence: "free", licence_name: "OFL", alternative: null },
      { kind: "font", name: "Söhne", source: "Klim", licence: "licence_required", licence_name: "Commercial (Klim)", alternative: "Inter" },
      { kind: "logo", name: "Site logo", source: null, licence: "style_only", licence_name: null, alternative: null },
    ],
    frames: [
      { name: "desktop", width: 1440, height: 900, webp: WEBP },
      { name: "mobile", width: 390, height: 844, webp: WEBP },
    ],
    text: { headings: [SOURCE_TEXT], paragraphs: [], actions: [] },
    assetCandidates: null,
  };
}

export function analysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    summary: "A calm, paper-toned interface where one teal accent marks every action and nothing else competes for attention.",
    principles: [
      { title: "One accent", rule: "Use the accent only for primary actions and links.", why: "A single loud colour makes the next step obvious." },
      { title: "Flat depth", rule: "Separate surfaces with hairline borders, not shadows.", why: "No shadows were measured; borders keep the page quiet." },
      { title: "Even rhythm", rule: "Space everything on the 8px grid.", why: "Nine in ten measured values fit it, which reads as order." },
    ],
    never: [
      { rule: "Never add gradients.", why: "Every measured surface is a solid colour." },
      { rule: "Never use a second accent.", why: "Only one saturated colour carries weight." },
      { rule: "Never use shadows for elevation.", why: "None were measured." },
    ],
    colour: ["Warm paper background with white cards.", "Teal accent on actions only."],
    typography: ["Inter throughout.", "Body at 16px with relaxed line height."],
    shape: ["12px radius on cards and buttons.", "1px borders in the border colour."],
    components: [{ kind: "button", name: "Primary button", recipe: "Accent background, on-accent text, 12px radius.", states: "Darkens slightly on hover.", use_when: "The main action of a view." }],
    layout: ["1152px container.", "96px section padding on desktop."],
    motion: { feel: "Quick and quiet.", rules: ["150ms colour transitions with ease-out."] },
    imagery: ["Photos sit in 16px rounded frames."],
    voice: { tone: ["calm", "direct"], rules: ["Short sentences.", "Lead with the benefit."], examples: [{ context: "headline", text: "Plan less, ship more." }] },
    ...overrides,
  };
}

export function scriptedWriter(responses: Analysis[]) {
  const calls: WriterInput[] = [];
  const writer: DesignWriter = {
    name: "scripted",
    async write(input) {
      calls.push(input);
      return responses[Math.min(calls.length - 1, responses.length - 1)];
    },
  };
  return { writer, calls };
}
