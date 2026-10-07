import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { geminiWriter, modelChain, WriterError } = await import("@/lib/generate/writer");
const { analysis } = await import("./helpers");

const input = { prompt: "p", images: [] };
const busy = () => new Error('{"error":{"code":503,"status":"UNAVAILABLE","message":"This model is currently experiencing high demand"}}');
const ok = () => ({ text: JSON.stringify(analysis()) });
const writer = () => geminiWriter({ backoffMs: 0 });
const calledModels = () => generateContent.mock.calls.map((c) => c[0].model);

describe("geminiWriter", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("GEMINI_MODEL", "main");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "");
  });
  afterEach(() => {
    generateContent.mockReset();
    vi.unstubAllEnvs();
  });

  it("requires configuration", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(() => geminiWriter()).toThrow(/not configured/);
  });

  it("reads a comma-separated fallback chain without duplicates", () => {
    expect(modelChain("a", " b, c ,a,, ")).toEqual(["a", "b", "c"]);
  });

  it("retries a busy model once before moving on", async () => {
    generateContent.mockRejectedValueOnce(busy()).mockResolvedValueOnce(ok());
    await writer().write(input);
    expect(calledModels()).toEqual(["main", "main"]);
  });

  it("walks the fallback chain when models stay busy", async () => {
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "second,third");
    generateContent.mockRejectedValueOnce(busy()).mockRejectedValueOnce(busy()).mockRejectedValueOnce(busy()).mockRejectedValueOnce(busy()).mockResolvedValueOnce(ok());
    const result = await writer().write(input);
    expect(result.summary).toContain("teal");
    expect(calledModels()).toEqual(["main", "main", "second", "second", "third"]);
  });

  it("skips a missing model straight away", async () => {
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "second");
    generateContent.mockRejectedValueOnce(new Error('{"error":{"code":404,"status":"NOT_FOUND"}}')).mockResolvedValueOnce(ok());
    await writer().write(input);
    expect(calledModels()).toEqual(["main", "second"]);
  });

  it("marks an exhausted chain as retryable", async () => {
    generateContent.mockRejectedValue(busy());
    await expect(writer().write(input)).rejects.toMatchObject({ retryable: true });
  });

  it("retries once when the output fails validation, then reports it", async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ summary: "too short" }) });
    await expect(writer().write(input)).rejects.toBeInstanceOf(WriterError);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});
