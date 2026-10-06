import "server-only";
import { GoogleGenAI } from "@google/genai";
import { AnalysisSchema, analysisJsonSchema, type Analysis } from "./analysis";

export type WriterInput = {
  prompt: string;
  images: { mimeType: "image/webp"; data: Buffer; label: string }[];
};

/** Anything that can turn a prompt and frames into an Analysis. Swappable in tests. */
export type DesignWriter = {
  name: string;
  write(input: WriterInput): Promise<Analysis>;
};

export class WriterError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}

/** Overloaded, rate limited or unreachable: worth retrying later, not the site's fault. */
function isTransient(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return /\b(429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|timed? ?out|ETIMEDOUT|ECONNRESET|fetch failed/i.test(text);
}

export function geminiWriter(): DesignWriter {
  const apiKey = process.env.GEMINI_API_KEY;
  const primary = process.env.GEMINI_MODEL;
  if (!apiKey || !primary) throw new WriterError("Gemini is not configured: set GEMINI_API_KEY and GEMINI_MODEL");
  // Optional second model, tried when the first is overloaded or unavailable.
  const models = [primary, process.env.GEMINI_FALLBACK_MODEL].filter((m): m is string => Boolean(m));
  // The SDK's default retry policy can wait minutes on a busy model. One 90s
  // attempt per model (a good answer takes ~70s) keeps the worst case, two
  // models plus rendering, inside the route's 300s limit.
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 90_000, retryOptions: { attempts: 1 } } });

  return {
    name: models.join(" → "),
    async write({ prompt, images }) {
      const parts = [
        { text: prompt },
        ...images.flatMap((image) => [
          { text: `Frame: ${image.label} (content removed: grey blocks are images, bars are text)` },
          { inlineData: { mimeType: image.mimeType, data: image.data.toString("base64") } },
        ]),
      ];

      let lastError: unknown;
      for (const model of models) {
        // Two tries per model: the second only when the output failed validation.
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: [{ role: "user", parts }],
              config: { temperature: 0.4, responseMimeType: "application/json", responseJsonSchema: analysisJsonSchema },
            });
            const parsed = AnalysisSchema.safeParse(JSON.parse(response.text ?? ""));
            if (parsed.success) return parsed.data;
            lastError = new WriterError(
              `${model} output failed validation: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
            );
          } catch (error) {
            lastError = error;
            break; // network, quota or availability problem: move to the next model
          }
        }
      }
      if (isTransient(lastError)) throw new WriterError(`all models unavailable: ${lastError instanceof Error ? lastError.message.slice(0, 200) : String(lastError)}`, true);
      throw lastError instanceof Error ? lastError : new WriterError(String(lastError));
    },
  };
}
