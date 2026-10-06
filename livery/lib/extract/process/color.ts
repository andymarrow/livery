// Colour parsing and maths for extracted values. Chrome's computed colours come
// back as rgb()/rgba(), or as color()/oklch()/oklab()/lab()/lch() when authored
// that way, so all of those are handled. Everything is converted to sRGB.

export type Rgba = { r: number; g: number; b: number; a: number }; // r,g,b 0-255, a 0-1

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function num(token: string, percentScale = 1) {
  if (token.endsWith("%")) return (parseFloat(token) / 100) * percentScale;
  if (token === "none") return 0;
  return parseFloat(token);
}

function oklabToRgb(L: number, a: number, b: number, alpha: number): Rgba {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return { r: clamp(fromLinear(r)) * 255, g: clamp(fromLinear(g)) * 255, b: clamp(fromLinear(bl)) * 255, a: alpha };
}

function labToRgb(L: number, a: number, b: number, alpha: number): Rgba {
  // CIE Lab (D50) -> XYZ D50 -> XYZ D65 (Bradford) -> linear sRGB
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const e = 216 / 24389;
  const k = 24389 / 27;
  const x = (fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k) * 0.96422;
  const y = L > k * e ? fy ** 3 : L / k;
  const z = (fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k) * 0.82521;
  const X = 0.9554734527042182 * x - 0.023098536874261423 * y + 0.0632593086610217 * z;
  const Y = -0.028369706963208136 * x + 1.0099954580058226 * y + 0.021041398966943008 * z;
  const Z = 0.012314001688319899 * x - 0.020507696433157768 * y + 1.3303659366080753 * z;
  const r = 3.2409699419 * X - 1.5373831776 * Y - 0.4986107603 * Z;
  const g = -0.9692436363 * X + 1.8759675015 * Y + 0.0415550574 * Z;
  const bl = 0.0556300797 * X - 0.2039769589 * Y + 1.0569715142 * Z;
  return { r: clamp(fromLinear(r)) * 255, g: clamp(fromLinear(g)) * 255, b: clamp(fromLinear(bl)) * 255, a: alpha };
}

export function parseColor(input: string): Rgba | null {
  const value = input.trim().toLowerCase();
  if (!value || value === "transparent" || value === "currentcolor" || value === "none") return null;

  const hex = value.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }

  const fn = value.match(/^([a-z]+)\((.*)\)$/);
  if (!fn) return null;
  const [, name, body] = fn;
  const [main, alphaPart] = body.includes("/") ? body.split("/") : [body, undefined];
  const parts = main.replace(/,/g, " ").trim().split(/\s+/);
  const extraAlpha = !alphaPart && (name === "rgba" || name === "hsla" || parts.length === 4 && name.startsWith("rgb")) ? parts[3] : undefined;
  const alpha = alphaPart !== undefined ? clamp(num(alphaPart.trim())) : extraAlpha !== undefined ? clamp(num(extraAlpha)) : 1;

  switch (name) {
    case "rgb":
    case "rgba":
      return { r: num(parts[0], 255), g: num(parts[1], 255), b: num(parts[2], 255), a: alpha };
    case "hsl":
    case "hsla": {
      const h = ((parseFloat(parts[0]) % 360) + 360) % 360;
      const s = num(parts[1].endsWith("%") ? parts[1] : `${parts[1]}%`);
      const l = num(parts[2].endsWith("%") ? parts[2] : `${parts[2]}%`);
      const k = (n: number) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a: alpha };
    }
    case "oklab":
      return oklabToRgb(num(parts[0]), num(parts[1], 0.4), num(parts[2], 0.4), alpha);
    case "oklch": {
      const L = num(parts[0]);
      const C = num(parts[1], 0.4);
      const H = (parseFloat(parts[2]) || 0) * (Math.PI / 180);
      return oklabToRgb(L, C * Math.cos(H), C * Math.sin(H), alpha);
    }
    case "lab":
      return labToRgb(num(parts[0], 100), num(parts[1], 125), num(parts[2], 125), alpha);
    case "lch": {
      const C = num(parts[1], 150);
      const H = (parseFloat(parts[2]) || 0) * (Math.PI / 180);
      return labToRgb(num(parts[0], 100), C * Math.cos(H), C * Math.sin(H), alpha);
    }
    case "color": {
      const [space, ...rest] = parts;
      const [r, g, b] = rest.map((p) => num(p));
      if (space === "srgb") return { r: r * 255, g: g * 255, b: b * 255, a: alpha };
      if (space === "display-p3") {
        const [lr, lg, lb] = [r, g, b].map(toLinear);
        const R = 1.2249401 * lr - 0.2249404 * lg;
        const G = -0.0420569 * lr + 1.0420571 * lg;
        const B = -0.0196376 * lr - 0.0786361 * lg + 1.0982735 * lb;
        return { r: clamp(fromLinear(R)) * 255, g: clamp(fromLinear(G)) * 255, b: clamp(fromLinear(B)) * 255, a: alpha };
      }
      return null;
    }
    default:
      return null;
  }
}

export function toHex({ r, g, b, a }: Rgba) {
  const h = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}${a < 0.995 ? h(a * 255) : ""}`;
}

/** Composites a translucent colour over an opaque backdrop. */
export function flatten(color: Rgba, backdrop: Rgba): Rgba {
  const a = color.a;
  return { r: color.r * a + backdrop.r * (1 - a), g: color.g * a + backdrop.g * (1 - a), b: color.b * a + backdrop.b * (1 - a), a: 1 };
}

export function toOklab({ r, g, b }: Rgba) {
  const [lr, lg, lb] = [r / 255, g / 255, b / 255].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Perceptual distance (OKLab Euclidean). ~0.02 is barely noticeable. */
export function distance(x: Rgba, y: Rgba) {
  const p = toOklab(x);
  const q = toOklab(y);
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

export function chroma(color: Rgba) {
  const { a, b } = toOklab(color);
  return Math.hypot(a, b);
}

export function hue(color: Rgba) {
  const { a, b } = toOklab(color);
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
}

export function luminance({ r, g, b }: Rgba) {
  const [lr, lg, lb] = [r / 255, g / 255, b / 255].map(toLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrast(x: Rgba, y: Rgba) {
  const [hi, lo] = [luminance(x), luminance(y)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
}
