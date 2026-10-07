import "server-only";
import { GoogleGenAI } from "@google/genai";
import { logger } from "@/lib/logger";
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

/** Overload and quota answers come back fast; a short pause and one retry often gets through. */
function isQuickRejection(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return /\b(429|503)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(text);
}

/** GEMINI_MODEL first, then every model in GEMINI_FALLBACK_MODEL (comma-separated), no duplicates. */
export function modelChain(primary: string, fallback: string | undefined) {
  return [...new Set([primary, ...(fallback ?? "").split(",")].map((m) => m.trim()).filter(Boolean))];
}

// The writer gets at most this long in total, leaving room for rendering and
// publishing inside the route's 300s limit. One attempt never exceeds 90s.
const WRITER_BUDGET_MS = 190_000;
const ATTEMPT_TIMEOUT_MS = 90_000;
const MIN_ATTEMPT_MS = 20_000;

export function geminiWriter({ backoffMs = 2_500 }: { backoffMs?: number } = {}): DesignWriter {
  const apiKey = process.env.GEMINI_API_KEY;
  const primary = process.env.GEMINI_MODEL;
  if (!apiKey || !primary) throw new WriterError("Gemini is not configured: set GEMINI_API_KEY and GEMINI_MODEL");
  const models = modelChain(primary, process.env.GEMINI_FALLBACK_MODEL);
  // Retries are ours, not the SDK's: its default policy can wait minutes.
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: ATTEMPT_TIMEOUT_MS, retryOptions: { attempts: 1 } } });
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      const deadline = Date.now() + WRITER_BUDGET_MS;
      let lastError: unknown;

      for (const model of models) {
        let quickRetries = 1; // one more try after a fast 503/429
        let validationRetries = 1; // one more try after malformed output
        while (true) {
          const remaining = deadline - Date.now();
          if (remaining < MIN_ATTEMPT_MS) break;
          const started = Date.now();
          try {
            const response = await ai.models.generateContent({
              model,
              contents: [{ role: "user", parts }],
              config: {
                temperature: 0.4,
                responseMimeType: "application/json",
                responseJsonSchema: analysisJsonSchema,
                abortSignal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
              },
            });
            const parsed = AnalysisSchema.safeParse(JSON.parse(response.text ?? ""));
            if (parsed.success) {
              logger.info("writer.answered", { model, ms: Date.now() - started });
              return parsed.data;
            }
            lastError = new WriterError(
              `${model} output failed validation: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
            );
            if (validationRetries-- > 0) continue;
            break;
          } catch (error) {
            lastError = error;
            logger.warn("writer.model_failed", { model, ms: Date.now() - started, error: (error instanceof Error ? error.message : String(error)).slice(0, 160) });
            if (isQuickRejection(error) && quickRetries-- > 0) {
              await pause(backoffMs + Math.round(Math.random() * backoffMs));
              continue;
            }
            break; // slow failure, missing model or second rejection: next model
          }
        }
        if (deadline - Date.now() < MIN_ATTEMPT_MS) break;
      }
      if (isTransient(lastError)) throw new WriterError(`all models unavailable: ${lastError instanceof Error ? lastError.message.slice(0, 200) : String(lastError)}`, true);
      throw lastError instanceof Error ? lastError : new WriterError(String(lastError));
    },
  };
}
