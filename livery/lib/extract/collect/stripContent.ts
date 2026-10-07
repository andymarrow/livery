// Runs inside the page, just before a frame is captured. Removes everything
// that belongs to the site's owner while keeping the design: images, video and
// non-icon SVGs become flat blocks in their average colour (or a neutral tone
// when the image can't be read), and text becomes soft bars in its own colour.
// Icons, borders, radii, spacing and backgrounds stay exactly as they were.

export async function stripContent(): Promise<number> {
  const neutral = (() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/\d+(\.\d+)?/g);
    if (!m) return "rgb(200, 200, 200)";
    const [r, g, b] = m.map(Number);
    const shift = r + g + b > 382 ? -28 : 28;
    return `rgb(${r + shift}, ${g + shift}, ${b + shift})`;
  })();

  const averageOf = (img: HTMLImageElement | HTMLVideoElement) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 8;
      canvas.height = 8;
      const ctx = canvas.getContext("2d");
      if (!ctx) return neutral;
      ctx.drawImage(img, 0, 0, 8, 8);
      const data = ctx.getImageData(0, 0, 8, 8).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 32) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
      return n ? `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})` : neutral;
    } catch {
      return neutral; // cross-origin image without CORS: the canvas is tainted
    }
  };

  const block = (el: Element, color: string) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const div = document.createElement("div");
    div.setAttribute("data-livery-block", "");
    div.style.cssText = `display:${s.display === "inline" ? "inline-block" : s.display};width:${r.width}px;height:${r.height}px;background:${color};border-radius:${s.borderRadius};margin:${s.margin};flex:${s.flex};grid-area:${s.gridArea};position:${s.position === "static" ? "relative" : s.position};inset:${s.inset};`;
    el.replaceWith(div);
  };

  let replaced = 0;
  document.querySelectorAll("img, video").forEach((el) => {
    const media = el as HTMLImageElement | HTMLVideoElement;
    const color = averageOf(media);
    media.style.setProperty("object-position", "-99999px -99999px", "important");
    media.style.setProperty("background", color, "important");
    if (media instanceof HTMLVideoElement) media.removeAttribute("poster");
    replaced++;
  });
  document.querySelectorAll("canvas, iframe, object, embed").forEach((el) => {
    block(el, neutral);
    replaced++;
  });
  document.querySelectorAll("svg").forEach((svg) => {
    const r = svg.getBoundingClientRect();
    if (r.width <= 48 && r.height <= 48 && !svg.closest("a[href='/']")) return; // icons stay
    block(svg, neutral);
    replaced++;
  });
  // Background images become their average colour, so textures keep their tone.
  const loadAverage = (src: string) =>
    new Promise<string | null>((resolve) => {
      const img = new Image();
      try {
        if (new URL(src, location.href).origin !== location.origin) img.crossOrigin = "anonymous";
      } catch {
        return resolve(null);
      }
      const timer = setTimeout(() => resolve(null), 2000);
      img.onload = () => {
        clearTimeout(timer);
        resolve(averageOf(img as unknown as HTMLImageElement));
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = src;
    });
  for (const el of Array.from(document.querySelectorAll("*"))) {
    const s = getComputedStyle(el);
    const match = s.backgroundImage && s.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
    if (!match) continue;
    const average = await loadAverage(match[1]);
    (el as HTMLElement).style.setProperty("background-image", "none", "important");
    if (average) (el as HTMLElement).style.setProperty("background-color", average, "important");
    else if (s.backgroundColor === "rgba(0, 0, 0, 0)") (el as HTMLElement).style.setProperty("background-color", neutral, "important");
    replaced++;
  }

  // Text -> bars. Each text node is wrapped so its line boxes can be painted.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent || !node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      if (parent.closest("script, style, noscript, svg, [data-livery-bar]")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const color = getComputedStyle(node.parentElement as Element).color;
    const span = document.createElement("span");
    span.setAttribute("data-livery-bar", "");
    // A soft bar across the x-height in the text's own colour, drawn as a
    // thick underline so it follows every line wrap: reads as copy without
    // the heavy full-height blocks a background would paint.
    span.style.cssText = `color:transparent !important;text-decoration:underline !important;text-decoration-color:color-mix(in srgb, ${color} 58%, transparent) !important;text-decoration-thickness:.46em !important;text-underline-offset:-.58em !important;text-decoration-skip-ink:none !important;`;
    node.replaceWith(span);
    span.appendChild(node);
  }

  const style = document.createElement("style");
  style.textContent = "input,textarea,select{color:transparent !important}input::placeholder,textarea::placeholder{color:transparent !important}";
  document.head.appendChild(style);
  return replaced;
}
