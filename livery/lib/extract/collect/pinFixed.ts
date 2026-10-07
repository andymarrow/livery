// Runs inside the page before a frame is captured screen by screen: fixed and
// sticky elements are pinned where they first appear, so a header shows once
// instead of on every screen. Self-contained (no imports): it's also bundled
// into the browser extension.
export function pinFixed() {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
    const position = getComputedStyle(el).position;
    if (position === "fixed") {
      const r = el.getBoundingClientRect();
      el.style.setProperty("position", "absolute", "important");
      el.style.setProperty("top", `${r.top + window.scrollY}px`, "important");
      el.style.setProperty("bottom", "auto", "important");
    } else if (position === "sticky") {
      el.style.setProperty("position", "relative", "important");
      el.style.setProperty("top", "auto", "important");
    }
  }
}
