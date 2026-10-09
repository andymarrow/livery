import { z } from "zod";

// What the extension may send. Everything is capped so a capture can't be
// used to store anything large or odd; text arrives empty (it's dropped
// anyway) and the frame must be a WebP.

const weighted = z.record(z.string().max(600), z.number().finite().min(0)).refine((r) => Object.keys(r).length <= 2000, "too many entries");
const shortText = z.string().max(600);

export const RawDesignSchema = z.object({
  url: z.string().max(2048),
  viewport: z.object({ width: z.number().int().min(200).max(4000), height: z.number().int().min(200).max(4000) }),
  documentHeight: z.number().min(0).max(200000),
  colors: z.object({ text: weighted, background: weighted, border: weighted, accentish: weighted }),
  pageBackground: shortText,
  rootVariables: z.record(z.string().max(200), z.string().max(2000)).refine((r) => Object.keys(r).length <= 1000, "too many variables"),
  textStyles: weighted,
  spacing: weighted,
  radii: weighted,
  shadows: weighted,
  borderWidths: weighted,
  transitions: z.object({ durations: weighted, easings: weighted, properties: weighted }),
  animations: weighted,
  keyframes: z.record(z.string().max(200), z.string().max(20000)).refine((r) => Object.keys(r).length <= 300, "too many keyframes"),
  motionUse: z
    .object({
      animations: z
        .array(
          z.object({
            name: z.string().max(200),
            count: z.number().int().min(0).max(100000),
            durationMs: z.number().min(0).max(3600000),
            delaysMs: z.array(z.number().min(-3600000).max(3600000)).max(12),
            iterations: z.union([z.number().min(0).max(100000), z.literal("infinite")]),
            easing: z.string().max(200),
            trigger: z.enum(["load", "hover", "focus", "state", "scroll"]),
            targets: z.array(z.string().max(40)).max(4),
            keyframes: z.string().max(1200),
          }),
        )
        .max(40),
      hover: weighted,
      hoverRules: z.number().int().min(0).max(1000000),
      reducedMotion: z.boolean(),
      lineArt: z.object({ svgs: z.number().int().min(0).max(100000), hairline: z.number().int().min(0).max(100000) }),
    })
    .optional(),
  signals: z
    .object({
      stack: z.array(z.object({ name: z.string().max(60), category: z.enum(["framework", "builder", "css", "ui", "motion", "scroll", "3d", "fonts"]), evidence: z.string().max(120), version: z.string().max(40).optional(), strong: z.boolean() })).max(30),
      canvases: z.object({ count: z.number().int().min(0).max(10000), largestShare: z.number().min(0).max(1), engines: z.array(z.string().max(40)).max(5), aboveFold: z.boolean(), colors: z.array(z.string().regex(/^#[0-9a-f]{6}$/)).max(5).optional() }),
      details: z.object({
        backdropBlur: z.number().int().min(0), blendModes: z.number().int().min(0), gradientText: z.number().int().min(0), outlinedText: z.number().int().min(0), sticky: z.number().int().min(0),
        preserve3d: z.number().int().min(0), clipShapes: z.number().int().min(0), masks: z.number().int().min(0), filters: weighted, fontFeatures: weighted, variableAxes: z.number().int().min(0),
        balancedText: z.number().int().min(0), underlineOffset: z.number().int().min(0), customCursor: z.boolean(), smoothScroll: z.boolean(), scrollSnap: z.boolean(), grain: z.boolean(),
        viewTransitions: z.boolean(), scrollbar: z.boolean(), selection: z.object({ background: shortText, color: shortText }).nullable(), focusRing: z.string().max(160).nullable(),
      }),
    })
    .optional(),
  mediaQueries: z.array(z.string().max(500)).max(2000),
  darkSchemeHints: z.array(z.string().max(100)).max(20),
  stylesheetHrefs: z.array(z.string().max(2048)).max(300),
  scriptSources: z.array(z.string().max(2048)).max(500),
  fontFaces: z.array(z.string().max(4000)).max(300),
  icons: z.object({
    svgs: z.array(z.object({}).passthrough()).max(2000),
    iconClasses: z.array(z.string().max(200)).max(2000),
    iconify: z.array(z.string().max(200)).max(2000),
  }),
  components: z.array(z.object({ kind: z.enum(["button", "input", "card", "badge", "tab", "nav-link"]) }).passthrough()).max(600),
  layout: z.object({
    containerWidths: weighted,
    sections: z.array(z.object({}).passthrough()).max(500),
    header: z.object({}).passthrough().nullable(),
    gridColumns: weighted,
    flexGaps: weighted,
  }),
  imagery: z.object({ images: z.number().min(0), backgroundImages: z.number().min(0), videos: z.number().min(0), roundedImages: z.number().min(0), averageImageRadius: z.number().min(0) }),
  text: z.object({ headings: z.array(z.string()).max(0), paragraphs: z.array(z.string()).max(0), actions: z.array(z.string()).max(0) }),
});

export const VoiceSchema = z.object({
  sampled: z.number().min(0),
  avgWords: z.number().min(0),
  you: z.number().min(0),
  we: z.number().min(0),
  exclaims: z.number().min(0),
  questions: z.number().min(0),
  titleCase: z.number().min(0),
  casedHeadings: z.number().min(0),
  uppercaseActions: z.number().min(0),
  verbActions: z.number().min(0),
  actionCount: z.number().min(0),
  avgActionWords: z.number().min(0),
  numbers: z.number().min(0),
});

export const CaptureRequestSchema = z.object({
  url: z.string().url().max(2048),
  viewport: z.object({ width: z.number().int().min(200).max(4000), height: z.number().int().min(200).max(4000) }),
  raw: RawDesignSchema,
  voice: VoiceSchema.optional(),
  /** Base64 WebP of the content-removed page. About 3 MB at most once decoded. */
  frame: z.string().max(4_200_000).optional(),
  target: z.discriminatedUnion("kind", [z.object({ kind: z.literal("kit"), slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120) }), z.object({ kind: z.literal("new") })]),
});
