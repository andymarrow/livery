// Runs in the page, only for sites whose owner granted assets (level 5).
// Never returns the logo: anything that looks like one is skipped.

export type AssetKind = "illustrations" | "custom_icons" | "photos";
export type AssetCandidates = { icons: string[]; illustrations: string[]; illustrationUrls: string[]; photoUrls: string[] };

export function collectAssets(kinds: AssetKind[]): AssetCandidates {
  const looksLikeLogo = (el: Element) => {
    const text = [el.getAttribute("class"), el.getAttribute("alt"), el.getAttribute("aria-label"), el.getAttribute("src"), el.id]
      .join(" ")
      .toLowerCase();
    if (/logo|brand|wordmark|favicon/.test(text)) return true;
    const home = el.closest("a[href='/'], a[href='./'], a[aria-label*='home' i]");
    return Boolean(home && home.closest("header, nav"));
  };
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  };

  const out: AssetCandidates = { icons: [], illustrations: [], illustrationUrls: [], photoUrls: [] };
  const seen = new Set<string>();

  for (const svg of Array.from(document.querySelectorAll("svg"))) {
    if (!visible(svg) || looksLikeLogo(svg)) continue;
    const r = svg.getBoundingClientRect();
    const markup = svg.outerHTML;
    if (seen.has(markup)) continue;
    seen.add(markup);
    const small = r.width <= 48 && r.height <= 48;
    if (small && kinds.includes("custom_icons") && out.icons.length < 40 && markup.length <= 20_000) out.icons.push(markup);
    if (!small && kinds.includes("illustrations") && out.illustrations.length < 12 && markup.length <= 200_000) out.illustrations.push(markup);
  }

  const images = Array.from(document.querySelectorAll("img"))
    .filter((img) => visible(img) && !looksLikeLogo(img) && img.currentSrc)
    .map((img) => ({ src: img.currentSrc, area: img.naturalWidth * img.naturalHeight, svg: /\.svg(\?|$)/i.test(img.currentSrc) }))
    .sort((a, b) => b.area - a.area);
  for (const image of images) {
    if (image.svg) {
      if (kinds.includes("illustrations") && out.illustrationUrls.length < 12 && !out.illustrationUrls.includes(image.src)) out.illustrationUrls.push(image.src);
    } else if (kinds.includes("photos") && image.area >= 200 * 200 && out.photoUrls.length < 12 && !out.photoUrls.includes(image.src)) {
      out.photoUrls.push(image.src);
    }
  }
  return out;
}
