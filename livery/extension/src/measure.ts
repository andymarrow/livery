// Injected into the tab the user clicked on (activeTab), only when they press
// Measure. Measures the live page, turns its copy into voice numbers (the text
// itself never leaves this page), then prepares a content-removed copy for
// the screenshots and finally puts the real page back exactly as it was.
//
// Uses Livery's own in-page code, so the extension measures exactly like the
// server does.
import { collectDesign } from "../../lib/extract/collect/collectDesign";
import { pinFixed } from "../../lib/extract/collect/pinFixed";
import { restoreContent, stripContent } from "../../lib/extract/collect/stripContent";
import { unrollInPage } from "../../lib/extract/collect/unroll";
import { voiceProfile } from "../../lib/generate/voice";

const MAX_HEIGHT = 8000;

type Saved = { x: number; y: number; scrollBehavior: string };
const state: { saved: Saved | null } = { saved: null };

const api = {
  async measure() {
    const raw = await collectDesign();
    const voice = voiceProfile(raw.text);
    raw.text = { headings: [], paragraphs: [], actions: [] };
    // Keyframes are CSS, but a typing effect can carry words in content: "...". Drop any such text.
    const noText = (css: string) => css.replace(/content:\s*(["'])(?:\\.|(?!\1).)*\1\s*;?/g, "content: none;");
    raw.keyframes = Object.fromEntries(Object.entries(raw.keyframes).map(([name, css]) => [name, noText(css)]));
    if (raw.motionUse) raw.motionUse.animations = raw.motionUse.animations.map((a) => ({ ...a, keyframes: noText(a.keyframes) }));
    document.querySelectorAll("[data-livery-probe]").forEach((el) => el.removeAttribute("data-livery-probe"));
    return { raw, voice, url: location.href, viewport: { width: window.innerWidth, height: window.innerHeight } };
  },

  /** Large canvases on the current screen (CSS pixels, largest first), shot before the page is frozen. */
  canvases() {
    return Array.from(document.querySelectorAll("canvas"))
      .map((canvas, index) => {
        const r = canvas.getBoundingClientRect();
        const x = Math.max(0, r.left);
        const y = Math.max(0, r.top);
        return { index, x, y, width: Math.min(window.innerWidth, r.right) - x, height: Math.min(window.innerHeight, r.bottom) - y };
      })
      .filter((b) => b.width >= 120 && b.height >= 80)
      .sort((a, b) => b.width * b.height - a.width * a.height)
      .slice(0, 4);
  },

  async prepare(mosaics: (string | null)[] = []) {
    const root = document.documentElement;
    state.saved = { x: window.scrollX, y: window.scrollY, scrollBehavior: root.style.getPropertyValue("scroll-behavior") };
    root.style.setProperty("scroll-behavior", "auto", "important");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    await stripContent(mosaics);
    unrollInPage();
    pinFixed();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    await new Promise((resolve) => setTimeout(resolve, 150));
    const height = Math.min(Math.max(root.scrollHeight, document.body.scrollHeight, window.innerHeight), MAX_HEIGHT);
    return { height, width: window.innerWidth, screen: window.innerHeight };
  },

  scrollTo(y: number) {
    window.scrollTo({ top: y, left: 0, behavior: "instant" });
    return Math.round(window.scrollY);
  },

  restore() {
    restoreContent();
    const saved = state.saved;
    const root = document.documentElement;
    if (saved) {
      if (saved.scrollBehavior) root.style.setProperty("scroll-behavior", saved.scrollBehavior);
      else root.style.removeProperty("scroll-behavior");
      window.scrollTo({ top: saved.y, left: saved.x, behavior: "instant" });
    }
    state.saved = null;
    return true;
  },
};

(window as unknown as { __livery: typeof api }).__livery = api;
export type MeasureApi = typeof api;
