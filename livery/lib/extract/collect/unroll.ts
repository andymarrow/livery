// Runs inside the page. App shells scroll inside a full-height element
// (<main class="h-dvh overflow-auto">) instead of the document, so the page
// is one screen tall. This lets the biggest such element grow to its content.
// Self-contained (no imports): it's also bundled into the browser extension.
export function unrollInPage() {
  const viewportWidth = window.innerWidth;
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("body *")).filter((el) => {
    const s = getComputedStyle(el);
    return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 200 && el.clientWidth >= viewportWidth * 0.5 && el.clientHeight >= window.innerHeight * 0.6;
  });
  if (document.documentElement.scrollHeight > window.innerHeight + 200 || !candidates.length) return;
  const main = candidates.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
  const open = (el: HTMLElement) => {
    el.style.setProperty("height", "auto", "important");
    el.style.setProperty("max-height", "none", "important");
    el.style.setProperty("overflow", "visible", "important");
  };
  open(main);
  for (let el = main.parentElement; el; el = el.parentElement) {
    open(el);
    el.style.setProperty("min-height", "100vh");
  }
}
