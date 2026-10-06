import { z } from "zod";

// /.well-known/livery.json: the owner's opt-in (or opt-out) file.
// Strict: anything unexpected or malformed means "no grant". There is
// deliberately no way to allow the logo.
export const GrantSchema = z
  .object({
    $schema: z.string().optional(),
    version: z.literal(1),
    owner: z.object({ name: z.string().min(1).max(120), contact: z.string().min(3).max(200) }).strict(),
    allow: z
      .object({
        levels: z.array(z.number().int().min(1).max(6)).max(6),
        assets: z.array(z.enum(["illustrations", "custom_icons", "photos"])).max(3).default([]),
        quote_text: z.boolean().default(false),
      })
      .strict(),
    paths: z.object({ include: z.array(z.string().startsWith("/").max(200)).max(50).default(["/"]), exclude: z.array(z.string().startsWith("/").max(200)).max(50).default([]) }).strict().optional(),
    terms: z
      .object({ licence: z.string().min(1).max(60), commercial: z.boolean(), attribution: z.string().max(300).optional() })
      .strict()
      .optional(),
    rules: z.url().startsWith("https://").max(500).optional(),
    updated: z.iso.date(),
  })
  .strict();

export type Grant = z.infer<typeof GrantSchema>;

export const GRANT_MAX_BYTES = 32 * 1024;
export const GRANT_PATH = "/.well-known/livery.json";
