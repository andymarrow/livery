import { z } from "zod";

// What the model writes. Values come from the extraction; the model supplies
// the reasons, the rules and the voice. Kept flat and simple so it maps cleanly
// onto Gemini's structured output.

const Rule = z.object({
  rule: z.string().min(8).max(240).describe("An instruction an agent can follow, in the imperative."),
  why: z.string().min(8).max(300).describe("The reason, grounded in what the measurements show."),
});

export const AnalysisSchema = z.object({
  summary: z.string().min(40).max(600).describe("Two or three sentences on the design's personality and the feeling it creates."),
  principles: z.array(z.object({ title: z.string().min(2).max(60), rule: z.string().min(8).max(240), why: z.string().min(8).max(300) })).min(3).max(7),
  never: z.array(Rule).min(3).max(8).describe("Things this design never does, each with its reason."),
  colour: z.array(z.string().min(8).max(240)).min(2).max(6).describe("How colour roles are used: where the accent appears, how surfaces separate."),
  typography: z.array(z.string().min(8).max(240)).min(2).max(6),
  shape: z.array(z.string().min(8).max(240)).min(2).max(6).describe("Radii, borders, depth and shadows."),
  components: z
    .array(
      z.object({
        kind: z.enum(["button", "input", "card", "badge", "tab", "nav-link"]),
        name: z.string().min(2).max(40).describe("A role name, e.g. 'Primary button'."),
        recipe: z.string().min(8).max(400).describe("How to build it from the tokens."),
        states: z.string().max(300).describe("Hover and focus behaviour, from the measured states."),
        use_when: z.string().max(200),
      }),
    )
    .max(10),
  layout: z.array(z.string().min(8).max(240)).min(2).max(8).describe("Containers, section rhythm, grids and mobile behaviour."),
  motion: z.object({ feel: z.string().min(8).max(240), rules: z.array(z.string().min(8).max(240)).max(6) }),
  imagery: z.array(z.string().min(8).max(240)).max(5).describe("How images and illustrations are treated (described, never copied)."),
  voice: z.object({
    tone: z.array(z.string().min(2).max(30)).min(2).max(6),
    rules: z.array(z.string().min(8).max(240)).min(2).max(8),
    examples: z
      .array(
        z.object({
          context: z.enum(["headline", "subheading", "button", "empty state", "error", "body"]),
          text: z.string().min(2).max(200).describe("A NEW sentence written in this voice. Never quote the site."),
        }),
      )
      .max(8),
  }),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export const analysisJsonSchema = z.toJSONSchema(AnalysisSchema, { target: "draft-7" });
