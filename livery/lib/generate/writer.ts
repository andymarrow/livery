import type { Analysis } from "./analysis";

export type WriterInput = {
  prompt: string;
  images: { mimeType: "image/webp"; data: Buffer; label: string }[];
};

/**
 * Anything that turns a kit's measurements (and optional prompt and frames)
 * into an Analysis. Livery uses measuredWriter (lib/generate/measured.ts): no
 * model, no network. A model-backed writer can be plugged in here later.
 */
export type DesignWriter = {
  name: string;
  write(input: WriterInput): Promise<Analysis>;
};

export class WriterError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}
