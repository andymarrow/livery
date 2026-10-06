// Runs inside the rendered page via page.evaluate(collectDesign).
// It must stay self-contained: no imports, no references to Node values.
// It only reads computed styles and DOM structure. Probed component elements
// get a data-livery-probe attribute so Node can hover and focus them later.

export type Weighted = Record<string, number>;

export type StyleSnapshot = {
  tag: string;
  bg: string;
  color: string;
  borderColor: string;
  borderWidth: string;
  borderStyle: string;
  radius: string;
  paddingX: number;
  paddingY: number;
  height: number;
  width: number;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  letterSpacing: string;
  textTransform: string;
  boxShadow: string;
  transition: string;
  outline: string;
  gap: string;
};

export type ComponentCandidate = { kind: "button" | "input" | "card" | "badge" | "tab" | "nav-link"; probe: string; style: StyleSnapshot };

export type SvgInfo = {
  classes: string;
  parentClasses: string;
  viewBox: string;
  width: number;
  height: number;
  strokeWidth: string;
  linecap: string;
  fill: string;
  stroke: string;
  inLogo: boolean;
  shapes: number;
};

export type RawDesign = {
  url: string;
  viewport: { width: number; height: number };
  documentHeight: number;
  colors: { text: Weighted; background: Weighted; border: Weighted; accentish: Weighted };
  pageBackground: string;
  rootVariables: Record<string, string>;
  textStyles: Weighted; // "family|size|weight|lineHeight|letterSpacing|role" -> characters
  spacing: Weighted;
  radii: Weighted;
  shadows: Weighted;
  borderWidths: Weighted;
  transitions: { durations: Weighted; easings: Weighted; properties: Weighted };
  animations: Weighted;
  keyframes: Record<string, string>;
  mediaQueries: string[];
  darkSchemeHints: string[];
  stylesheetHrefs: string[];
  scriptSources: string[];
  fontFaces: string[];
  icons: { svgs: SvgInfo[]; iconClasses: string[]; iconify: string[] };
  components: ComponentCandidate[];
  layout: {
    containerWidths: Weighted;
    sections: { top: number; height: number; paddingTop: number; paddingBottom: number; display: string; columns: number }[];
    header: { height: number; position: string; background: string; borderBottom: string } | null;
    gridColumns: Weighted;
    flexGaps: Weighted;
  };
  imagery: { images: number; backgroundImages: number; videos: number; roundedImages: number; averageImageRadius: number };
  text: { headings: string[]; paragraphs: string[]; actions: string[] };
};

export async function collectDesign(): Promise<RawDesign> {
  const MAX_ELEMENTS = 6000;
  const bump = (map: Record<string, number>, key: string, by = 1) => {
    if (!key) return;
    map[key] = (map[key] || 0) + by;
  };
  const transparent = (c: string) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c);
  const px = (v: string) => parseFloat(v) || 0;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const docHeight = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);

  const visible = (el: Element, style: CSSStyleDeclaration) => {
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const effectiveBackground = (el: Element | null): string => {
    let node: Element | null = el;
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      if (!transparent(bg)) return bg;
      node = node.parentElement;
    }
    return getComputedStyle(document.documentElement).backgroundColor || "rgb(255, 255, 255)";
  };

  // Average colour of a background image (paper textures, gradients-as-images),
  // composited over the element's own background colour. Same-origin images
  // can be read directly; others only when the server allows CORS.
  const averageImage = (src: string, base: string) =>
    new Promise<string | null>((resolve) => {
      const img = new Image();
      const sameOrigin = (() => {
        try {
          return new URL(src, location.href).origin === location.origin;
        } catch {
          return false;
        }
      })();
      if (!sameOrigin) img.crossOrigin = "anonymous";
      const timer = setTimeout(() => resolve(null), 2500);
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 16;
          canvas.height = 16;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.fillStyle = transparent(base) ? "#ffffff" : base;
          ctx.fillRect(0, 0, 16, 16);
          ctx.drawImage(img, 0, 0, 16, 16);
          const d = ctx.getImageData(0, 0, 16, 16).data;
          let r = 0, g = 0, b = 0;
          for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
          const n = d.length / 4;
          resolve(`rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`);
        } catch {
          resolve(null);
        }
      };
      img.src = src;
    });

  const ownText = (el: Element) => {
    let text = "";
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) text += n.textContent || "";
    });
    return text.replace(/\s+/g, " ").trim();
  };

  const snapshot = (el: Element): StyleSnapshot => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      bg: transparent(s.backgroundColor) ? "transparent" : s.backgroundColor,
      color: s.color,
      borderColor: s.borderTopColor,
      borderWidth: s.borderTopWidth,
      borderStyle: s.borderTopStyle,
      radius: s.borderTopLeftRadius,
      paddingX: Math.round(px(s.paddingLeft)),
      paddingY: Math.round(px(s.paddingTop)),
      height: Math.round(r.height),
      width: Math.round(r.width),
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      letterSpacing: s.letterSpacing,
      textTransform: s.textTransform,
      boxShadow: s.boxShadow,
      transition: s.transition,
      outline: s.outlineStyle === "none" ? "none" : `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`,
      gap: s.gap,
    };
  };

  const colors = { text: {} as Weighted, background: {} as Weighted, border: {} as Weighted, accentish: {} as Weighted };
  const textStyles: Weighted = {};
  const spacing: Weighted = {};
  const radii: Weighted = {};
  const shadows: Weighted = {};
  const borderWidths: Weighted = {};
  const transitions = { durations: {} as Weighted, easings: {} as Weighted, properties: {} as Weighted };
  const animations: Weighted = {};
  const containerWidths: Weighted = {};
  const gridColumns: Weighted = {};
  const flexGaps: Weighted = {};
  const components: ComponentCandidate[] = [];
  const counts: Record<string, number> = {};
  let probeId = 0;
  const imagery = { images: 0, backgroundImages: 0, videos: 0, roundedImages: 0, averageImageRadius: 0 };
  let imageRadiusTotal = 0;
  const text = { headings: [] as string[], paragraphs: [] as string[], actions: [] as string[] };
  const seenText = new Set<string>();

  const addProbe = (kind: ComponentCandidate["kind"], el: Element, limit: number) => {
    counts[kind] = (counts[kind] || 0) + 1;
    if (counts[kind] > limit) return;
    const id = `p${probeId++}`;
    el.setAttribute("data-livery-probe", id);
    components.push({ kind, probe: id, style: snapshot(el) });
  };

  const roleOf = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return tag;
    if (tag === "button" || el.getAttribute("role") === "button") return "button";
    if (tag === "a") return "link";
    if (tag === "small" || tag === "figcaption" || tag === "label") return "small";
    if (tag === "code" || tag === "pre" || tag === "kbd") return "code";
    return "body";
  };

  const elements = Array.from(document.body ? document.body.querySelectorAll("*") : []).slice(0, MAX_ELEMENTS);

  for (const el of elements) {
    const s = getComputedStyle(el);
    if (!visible(el, s)) continue;
    const r = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "noscript") continue;
    const area = Math.min(r.width, vw) * Math.min(r.height, docHeight);

    if (!transparent(s.backgroundColor)) bump(colors.background, s.backgroundColor, area);
    if (s.borderTopStyle !== "none" && px(s.borderTopWidth) > 0 && !transparent(s.borderTopColor)) {
      bump(colors.border, s.borderTopColor, r.width + r.height);
      bump(borderWidths, s.borderTopWidth);
    }
    const own = ownText(el);
    if (own) {
      bump(colors.text, s.color, own.length);
      const lineHeight = s.lineHeight === "normal" ? "normal" : (px(s.lineHeight) / px(s.fontSize)).toFixed(2);
      bump(textStyles, [s.fontFamily, s.fontSize, s.fontWeight, lineHeight, s.letterSpacing, roleOf(el)].join("|"), own.length);
    }

    for (const prop of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginBottom", "rowGap", "columnGap"] as const) {
      const value = Math.round(px(s[prop]));
      if (value > 0 && value <= 256) bump(spacing, String(value));
    }
    if (px(s.borderTopLeftRadius) > 0) bump(radii, s.borderTopLeftRadius, 1);
    if (s.boxShadow && s.boxShadow !== "none") bump(shadows, s.boxShadow);

    if (s.transitionDuration && s.transitionDuration !== "0s") {
      s.transitionDuration.split(",").forEach((d) => d.trim() !== "0s" && bump(transitions.durations, d.trim()));
      s.transitionTimingFunction.split(/,(?![^(]*\))/).forEach((e) => bump(transitions.easings, e.trim()));
      s.transitionProperty.split(",").forEach((p) => bump(transitions.properties, p.trim()));
    }
    if (s.animationName && s.animationName !== "none") s.animationName.split(",").forEach((n) => bump(animations, n.trim()));

    if (s.display === "grid" && s.gridTemplateColumns !== "none") bump(gridColumns, String(s.gridTemplateColumns.split(" ").length));
    if ((s.display === "flex" || s.display === "inline-flex") && px(s.columnGap) > 0) bump(flexGaps, String(Math.round(px(s.columnGap))));

    const maxWidth = px(s.maxWidth);
    if (maxWidth >= 480 && maxWidth < 2400 && Math.abs(r.left + r.width / 2 - vw / 2) < 4) bump(containerWidths, String(Math.round(maxWidth)));

    if (tag === "img" || tag === "picture") {
      imagery.images++;
      if (px(s.borderTopLeftRadius) > 0) {
        imagery.roundedImages++;
        imageRadiusTotal += px(s.borderTopLeftRadius);
      }
    }
    if (tag === "video") imagery.videos++;
    if (s.backgroundImage && s.backgroundImage.startsWith("url(")) imagery.backgroundImages++;

    // Component candidates
    const textLength = (el.textContent || "").trim().length;
    const bgDiffers = !transparent(s.backgroundColor) && s.backgroundColor !== effectiveBackground(el.parentElement);
    const hasBorder = s.borderTopStyle !== "none" && px(s.borderTopWidth) > 0;
    const isButtonish =
      tag === "button" || el.getAttribute("role") === "button" || (tag === "input" && /submit|button/.test((el as HTMLInputElement).type));
    if (
      (isButtonish || (tag === "a" && (bgDiffers || hasBorder) && px(s.paddingLeft) >= 8)) &&
      r.height >= 24 && r.height <= 72 && r.width <= 480 && textLength > 0 && textLength <= 40
    ) {
      addProbe("button", el, 24);
      if (bgDiffers) bump(colors.accentish, s.backgroundColor, 1);
    } else if (tag === "input" || tag === "textarea" || tag === "select") {
      if (!/hidden|checkbox|radio|submit|button|range|file|color/.test((el as HTMLInputElement).type || "")) addProbe("input", el, 8);
    } else if (el.getAttribute("role") === "tab") {
      addProbe("tab", el, 8);
    } else if (
      (bgDiffers || hasBorder) && r.height >= 14 && r.height <= 32 && textLength > 0 && textLength <= 24 && px(s.fontSize) <= 14 &&
      px(s.borderTopLeftRadius) >= 4 && s.display.startsWith("inline")
    ) {
      addProbe("badge", el, 12);
    } else if (
      /^(div|article|li|section|a|aside)$/.test(tag) && (bgDiffers || hasBorder) && px(s.borderTopLeftRadius) >= 4 &&
      px(s.paddingTop) >= 12 && r.width >= 160 && r.width < vw * 0.92 && r.height >= 80 && textLength > 20
    ) {
      addProbe("card", el, 24);
    } else if (tag === "a" && el.closest("header, nav") && textLength > 0 && textLength <= 30) {
      addProbe("nav-link", el, 10);
    }
    if (tag === "a" && !el.closest("header, nav, footer") && !bgDiffers && s.color !== getComputedStyle(el.parentElement || el).color) {
      bump(colors.accentish, s.color, 1);
    }

    // Text samples for voice analysis (kept in memory, never stored)
    const sample = (el as HTMLElement).innerText ? (el as HTMLElement).innerText.replace(/\s+/g, " ").trim() : "";
    if (sample && sample.length >= 2 && sample.length <= 400 && !seenText.has(sample)) {
      if (/^h[1-3]$/.test(tag) && text.headings.length < 30) { text.headings.push(sample); seenText.add(sample); }
      else if (tag === "p" && sample.length >= 40 && text.paragraphs.length < 40) { text.paragraphs.push(sample); seenText.add(sample); }
      else if (isButtonish && text.actions.length < 30) { text.actions.push(sample); seenText.add(sample); }
    }
  }
  imagery.averageImageRadius = imagery.roundedImages ? Math.round(imageRadiusTotal / imagery.roundedImages) : 0;

  // Stylesheets: root variables, keyframes, media queries (same-origin sheets only)
  const rootVariables: Record<string, string> = {};
  const keyframes: Record<string, string> = {};
  const mediaQueries = new Set<string>();
  const darkSchemeHints = new Set<string>();
  const rootStyle = getComputedStyle(document.documentElement);
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const selector = rule.selectorText || "";
        if (/(^|,)\s*(:root|html)\s*(,|$)/.test(selector)) {
          for (const name of Array.from(rule.style)) {
            if (name.startsWith("--") && Object.keys(rootVariables).length < 300) {
              rootVariables[name] = rootStyle.getPropertyValue(name).trim() || rule.style.getPropertyValue(name).trim();
            }
          }
        }
        if (/\.dark\b|\[data-theme=["']?dark|\[data-mode=["']?dark|\.theme-dark/.test(selector)) darkSchemeHints.add("class");
      } else if (rule instanceof CSSKeyframesRule) {
        if (Object.keys(keyframes).length < 40) keyframes[rule.name] = rule.cssText.slice(0, 1200);
      } else if (rule instanceof CSSMediaRule) {
        const condition = rule.conditionText || rule.media.mediaText;
        if (/prefers-color-scheme:\s*dark/.test(condition)) darkSchemeHints.add("media");
        if (/width/.test(condition)) mediaQueries.add(condition);
        walk(rule.cssRules);
      } else if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
        walk((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      // Cross-origin sheet: values still arrive through computed styles.
    }
  }

  // Icons
  const svgs: SvgInfo[] = [];
  document.querySelectorAll("svg").forEach((svg) => {
    if (svgs.length >= 120) return;
    const r = svg.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const s = getComputedStyle(svg);
    const firstShape = svg.querySelector("path, circle, rect, line, polyline, polygon");
    const shapeStyle = firstShape ? getComputedStyle(firstShape) : s;
    const homeLink = svg.closest("a[href='/'], a[href='./'], a[href='#'], a[aria-label*='home' i]");
    const inLogo = Boolean((homeLink && homeLink.closest("header, nav")) || /logo|brand|wordmark/i.test(`${svg.getAttribute("class") || ""} ${svg.getAttribute("aria-label") || ""} ${(svg.closest("[class]") as Element | null)?.getAttribute("class") || ""}`));
    svgs.push({
      classes: svg.getAttribute("class") || "",
      parentClasses: (svg.parentElement && svg.parentElement.getAttribute("class")) || "",
      viewBox: svg.getAttribute("viewBox") || "",
      width: Math.round(r.width),
      height: Math.round(r.height),
      strokeWidth: svg.getAttribute("stroke-width") || shapeStyle.strokeWidth,
      linecap: svg.getAttribute("stroke-linecap") || shapeStyle.strokeLinecap,
      fill: svg.getAttribute("fill") || shapeStyle.fill,
      stroke: svg.getAttribute("stroke") || shapeStyle.stroke,
      inLogo,
      shapes: svg.querySelectorAll("path, circle, rect, line, polyline, polygon, ellipse").length,
    });
  });
  const iconClasses = new Set<string>();
  document.querySelectorAll("i[class], span[class], svg[class]").forEach((el) => {
    const cls = el.getAttribute("class") || "";
    if (/\b(lucide|ph|ph-[a-z-]+|ti|ti-[a-z-]+|icon-tabler|fa-[a-z-]+|fa|fas|far|fal|fat|fad|fab|bi|bi-[a-z-]+|material-icons|material-symbols-[a-z]+|ri-[a-z-]+|bx|bx-[a-z-]+|feather|heroicon)\b/.test(cls)) {
      if (iconClasses.size < 80) iconClasses.add(cls.slice(0, 120));
    }
  });
  const iconify = Array.from(document.querySelectorAll("iconify-icon, [data-icon]"))
    .map((el) => el.getAttribute("icon") || el.getAttribute("data-icon") || "")
    .filter(Boolean)
    .slice(0, 60);

  // Layout
  const sections: RawDesign["layout"]["sections"] = [];
  const main = document.querySelector("main") || document.body;
  if (main) {
    Array.from(main.children).forEach((child) => {
      const s = getComputedStyle(child);
      const r = child.getBoundingClientRect();
      if (r.height < 120 || !visible(child, s)) return;
      sections.push({
        top: Math.round(r.top + window.scrollY),
        height: Math.round(r.height),
        paddingTop: Math.round(px(s.paddingTop)),
        paddingBottom: Math.round(px(s.paddingBottom)),
        display: s.display,
        columns: s.display === "grid" ? s.gridTemplateColumns.split(" ").length : 1,
      });
    });
  }
  const headerEl = document.querySelector("header") || document.querySelector("nav");
  const header = headerEl
    ? (() => {
        const s = getComputedStyle(headerEl);
        return {
          height: Math.round(headerEl.getBoundingClientRect().height),
          position: s.position,
          background: effectiveBackground(headerEl),
          borderBottom: s.borderBottomStyle === "none" ? "none" : `${s.borderBottomWidth} ${s.borderBottomColor}`,
        };
      })()
    : null;

  // The page background as people see it: a full-size background image on
  // html/body/the first wrapper wins over the colour underneath it.
  let pageBackground = effectiveBackground(document.body);
  for (const el of [document.documentElement, document.body, document.body?.firstElementChild, document.querySelector("main")]) {
    if (!el) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const match = s.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
    if (!match || r.width < vw * 0.9) continue;
    const average = await averageImage(match[1], s.backgroundColor);
    if (average) {
      pageBackground = average;
      bump(colors.background, average, vw * docHeight * 2);
      break;
    }
  }

  return {
    url: location.href,
    viewport: { width: vw, height: vh },
    documentHeight: docHeight,
    colors,
    pageBackground,
    rootVariables,
    textStyles,
    spacing,
    radii,
    shadows,
    borderWidths,
    transitions,
    animations,
    keyframes,
    mediaQueries: Array.from(mediaQueries).slice(0, 80),
    darkSchemeHints: Array.from(darkSchemeHints),
    stylesheetHrefs: Array.from(document.querySelectorAll("link[rel~='stylesheet']")).map((l) => (l as HTMLLinkElement).href).slice(0, 40),
    scriptSources: Array.from(document.querySelectorAll("script[src]")).map((s) => (s as HTMLScriptElement).src).slice(0, 60),
    fontFaces: Array.from(new Set(Array.from(document.fonts).filter((f) => f.status === "loaded").map((f) => f.family.replace(/^["']|["']$/g, "")))),
    icons: { svgs, iconClasses: Array.from(iconClasses), iconify },
    components,
    layout: { containerWidths, sections: sections.slice(0, 30), header, gridColumns, flexGaps },
    imagery,
    text,
  };
}
