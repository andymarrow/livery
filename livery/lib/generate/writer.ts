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

export class WriterError extends Error {}

export function geminiWriter(): DesignWriter {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) throw new WriterError("Gemini is not configured: set GEMINI_API_KEY and GEMINI_MODEL");
  const ai = new GoogleGenAI({ apiKey });

  return {
    name: model,
    async write({ prompt, images }) {
      const parts = [
        { text: prompt },
        ...images.flatMap((image) => [
          { text: `Frame: ${image.label} (content removed: grey blocks are images, bars are text)` },
          { inlineData: { mimeType: image.mimeType, data: image.data.toString("base64") } },
        ]),
      ];

      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts }],
            config: {
              temperature: 0.4,
              responseMimeType: "application/json",
              responseJsonSchema: analysisJsonSchema,
            },
          });
          const parsed = AnalysisSchema.safeParse(JSON.parse(response.text ?? ""));
          if (parsed.success) return parsed.data;
          lastError = new WriterError(`model output failed validation: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError instanceof Error ? lastError : new WriterError(String(lastError));
    },
  };
}
