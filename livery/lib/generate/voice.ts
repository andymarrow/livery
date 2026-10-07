// The voice of a page's copy as numbers only (sentence length, casing, person,
// punctuation). Pure and dependency-free: it runs on the server and inside the
// browser extension, where the text itself never leaves the page.

type Text = { headings: string[]; paragraphs: string[]; actions: string[] };

const VERBS = /^(get|start|try|book|join|sign|create|build|explore|learn|see|view|read|watch|download|contact|talk|buy|shop|discover|find|make|open|request|subscribe|order|launch|go|back|enter|host|vote|apply|install|add|save|share|send|claim)\b/i;

/** Numbers only, so it can be stored with a kit and combined later; never the copy itself. */
export function voiceProfile(text: Text) {
  const prose = [...text.paragraphs, ...text.headings];
  const sentences = prose.flatMap((p) => p.split(/(?<=[.!?])\s+/)).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3);
  const words = prose.join(" ").split(/\s+/).filter(Boolean);
  const avgWords = sentences.length ? sentences.reduce((n, s) => n + s.split(/\s+/).length, 0) / sentences.length : 0;
  const per100 = (re: RegExp) => (words.length ? (prose.join(" ").match(re)?.length ?? 0) / (words.length / 100) : 0);
  const titleCase = text.headings.filter((h) => {
    const long = h.split(/\s+/).filter((w) => w.length >= 4);
    return long.length >= 2 && long.filter((w) => /^[A-Z]/.test(w)).length / long.length > 0.7;
  }).length;
  const casedHeadings = text.headings.filter((h) => h.split(/\s+/).filter((w) => w.length >= 4).length >= 2).length;
  const actions = text.actions.filter((a) => a.length <= 40);
  return {
    sampled: sentences.length + text.headings.length + actions.length,
    avgWords,
    you: per100(/\b(you|your|you're|yours)\b/gi),
    we: per100(/\b(we|our|we're|us)\b/gi),
    exclaims: prose.filter((p) => p.includes("!")).length,
    questions: text.headings.filter((h) => h.trim().endsWith("?")).length,
    titleCase,
    casedHeadings,
    uppercaseActions: actions.filter((a) => a === a.toUpperCase() && /[A-Z]/.test(a)).length,
    verbActions: actions.filter((a) => VERBS.test(a.trim())).length,
    actionCount: actions.length,
    avgActionWords: actions.length ? actions.reduce((n, a) => n + a.split(/\s+/).length, 0) / actions.length : 0,
    numbers: per100(/\b\d[\d,.%$]*\b/g),
  };
}




export type VoiceProfile = ReturnType<typeof voiceProfile>;
