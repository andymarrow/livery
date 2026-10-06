// Copy guard: no run of 8 words in a kit may match the source site's text.
// The model reads the site's copy to learn its voice, but must write new words.

export const NGRAM = 8;

const words = (text: string) => text.toLowerCase().normalize("NFKD").match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];

function ngrams(text: string, n = NGRAM) {
  const w = words(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}

export function sourceIndex(texts: string[]) {
  const index = new Set<string>();
  for (const text of texts) for (const gram of ngrams(text)) index.add(gram);
  return index;
}

/** Returns the matching 8-word runs found in `text`, if any. */
export function overlaps(text: string, index: Set<string>) {
  return [...ngrams(text)].filter((gram) => index.has(gram));
}
