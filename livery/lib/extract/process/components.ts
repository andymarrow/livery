import type { Page } from "playwright-core";
import type { ComponentCandidate, StyleSnapshot } from "../collect/collectDesign";
import { parseColor, toHex } from "./color";
import { visibleShadow } from "./tokens";

export type ComponentState = Partial<Pick<StyleSnapshot, "bg" | "color" | "borderColor" | "boxShadow" | "outline">> & { transform?: string; opacity?: string };

export type ComponentVariant = {
  kind: ComponentCandidate["kind"];
  count: number;
  style: {
    background: string | null;
    text: string;
    border: string | null;
    radius: string;
    paddingX: number;
    paddingY: number;
    height: number;
    fontSize: string;
    fontWeight: string;
    letterSpacing: string;
    textTransform: string;
    shadow: string | null;
    transition: string | null;
  };
  hover: ComponentState | null;
  focus: ComponentState | null;
};

const hex = (value: string) => {
  if (!value || value === "transparent") return null;
  const parsed = parseColor(value);
  return parsed && parsed.a > 0.01 ? toHex(parsed) : null;
};

function signature(c: ComponentCandidate) {
  const s = c.style;
  const bucket = (n: number) => Math.round(n / 4) * 4;
  return [c.kind, hex(s.bg), hex(s.color), s.borderStyle === "none" ? "-" : hex(s.borderColor), s.radius, s.fontWeight, bucket(s.paddingX), bucket(s.height)].join("|");
}

// Reads the state-relevant properties of one probed element.
async function readState(page: Page, probe: string) {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-livery-probe="${id}"]`);
    if (!el) return null;
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, color: s.color, borderColor: s.borderTopColor, boxShadow: s.boxShadow, outline: s.outlineStyle === "none" ? "none" : `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`, transform: s.transform, opacity: s.opacity };
  }, probe);
}

function diff(base: Record<string, string>, next: Record<string, string> | null): ComponentState | null {
  if (!next) return null;
  const changed: Record<string, string> = {};
  for (const [key, value] of Object.entries(next)) {
    if (base[key] !== value) changed[key] = ["bg", "color", "borderColor"].includes(key) ? (hex(value) ?? value) : value;
  }
  return Object.keys(changed).length ? (changed as ComponentState) : null;
}

const settle = (style: StyleSnapshot) => {
  const durations = style.transition.match(/([\d.]+)(ms|s)/g) ?? [];
  const longest = Math.max(0, ...durations.map((d) => (d.endsWith("ms") ? parseFloat(d) : parseFloat(d) * 1000)));
  return Math.min(600, longest + 60);
};

/**
 * Groups candidates into variants (e.g. "primary button", "ghost button"), then
 * hovers and focuses one real element of each top variant to record its states.
 */
export async function analyseComponents(page: Page, candidates: ComponentCandidate[]): Promise<ComponentVariant[]> {
  const groups = new Map<string, ComponentCandidate[]>();
  for (const candidate of candidates) groups.set(signature(candidate), [...(groups.get(signature(candidate)) ?? []), candidate]);

  const perKind = new Map<string, number>();
  const variants: ComponentVariant[] = [];
  for (const members of [...groups.values()].sort((a, b) => b.length - a.length)) {
    const sample = members[0];
    const used = perKind.get(sample.kind) ?? 0;
    if (used >= 3) continue;
    perKind.set(sample.kind, used + 1);

    const s = sample.style;
    const base = { bg: s.bg, color: s.color, borderColor: s.borderColor, boxShadow: s.boxShadow, outline: s.outline, transform: "none", opacity: "1" };
    const baseline = await readState(page, sample.probe).catch(() => null);
    let hover: ComponentState | null = null;
    let focus: ComponentState | null = null;
    try {
      const locator = page.locator(`[data-livery-probe="${sample.probe}"]`).first();
      await locator.scrollIntoViewIfNeeded({ timeout: 2_000 });
      await locator.hover({ timeout: 2_000, force: true });
      await page.waitForTimeout(settle(s));
      hover = diff(baseline ?? base, await readState(page, sample.probe));
      await page.mouse.move(0, 0);
      if (["button", "input", "tab"].includes(sample.kind)) {
        await locator.focus({ timeout: 2_000 });
        await page.waitForTimeout(settle(s));
        focus = diff(baseline ?? base, await readState(page, sample.probe));
        await locator.blur();
      }
    } catch {
      // The element moved or detached; keep the default style only.
    }

    variants.push({
      kind: sample.kind,
      count: members.length,
      style: {
        background: hex(s.bg),
        text: hex(s.color) ?? s.color,
        border: s.borderStyle === "none" || parseFloat(s.borderWidth) === 0 ? null : `${s.borderWidth} ${s.borderStyle} ${hex(s.borderColor) ?? s.borderColor}`,
        radius: parseFloat(s.radius) >= 999 ? "9999px" : s.radius,
        paddingX: s.paddingX,
        paddingY: s.paddingY,
        height: s.height,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        letterSpacing: s.letterSpacing,
        textTransform: s.textTransform,
        shadow: s.boxShadow === "none" ? null : visibleShadow(s.boxShadow),
        transition: s.transition && !/^all 0s ease 0s$/.test(s.transition) ? s.transition : null,
      },
      hover,
      focus,
    });
  }
  return variants;
}
