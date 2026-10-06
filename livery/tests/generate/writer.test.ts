import { afterEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { geminiWriter, WriterError } = await import("@/lib/generate/writer");
const { analysis } = await import("./helpers");

const input = { prompt: "p", images: [] };

describe("geminiWriter", () => {
  afterEach(() => {
    generateContent.mockReset();
    vi.unstubAllEnvs();
  });

  it("requires configuration", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(() => geminiWriter()).toThrow(/not configured/);
  });

  it("falls back to the second model when the first is overloaded", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("GEMINI_MODEL", "main");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "backup");
    generateContent.mockRejectedValueOnce(new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}')).mockResolvedValueOnce({ text: JSON.stringify(analysis()) });
    const result = await geminiWriter().write(input);
    expect(result.summary).toContain("teal");
    expect(generateContent.mock.calls.map((c) => c[0].model)).toEqual(["main", "backup"]);
  });

  it("marks exhausted, overloaded models as retryable", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("GEMINI_MODEL", "main");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "");
    generateContent.mockRejectedValue(new Error("This model is currently experiencing high demand"));
    await expect(geminiWriter().write(input)).rejects.toMatchObject({ retryable: true });
  });

  it("retries once when the output fails validation, then reports it", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("GEMINI_MODEL", "main");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "");
    generateContent.mockResolvedValue({ text: JSON.stringify({ summary: "too short" }) });
    await expect(geminiWriter().write(input)).rejects.toBeInstanceOf(WriterError);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});
