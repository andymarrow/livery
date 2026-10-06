import "server-only";
import { safeFetch } from "@/lib/url/ssrf";

const MAX_BYTES = 128 * 1024;

/** Level 4: the owner's design rules document (Markdown or plain text, https only). */
export async function fetchOwnerRules(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const result = await safeFetch(parsed, { timeoutMs: 8_000, maxRedirects: 3, accept: "text/markdown,text/plain;q=0.9,*/*;q=0.1" });
  if (!result.ok) return null;
  const { response } = result.value;
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !/text\/(markdown|plain|x-markdown)/i.test(type)) {
    await response.body?.cancel();
    return null;
  }
  const text = (await response.text()).slice(0, MAX_BYTES).trim();
  // HTML pages are not rules documents.
  return text && !/^<!doctype html|^<html/i.test(text) ? text : null;
}
