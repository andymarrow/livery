import "server-only";
import type { Page } from "playwright-core";
import { EXTRACTOR_VERSION } from "@/constants/constants";
import type { KitItemKind, KitLicence } from "@/lib/supabase/database.types";
import { collectDesign, type RawDesign } from "./collect/collectDesign";
import { captureFrame, type Frame } from "./frames";
import { luminance, parseColor } from "./process/color";
import { analyseComponents, type ComponentVariant } from "./process/components";
import { identifyFonts, type FontInfo } from "./process/fonts";
import { identifyIcons, type IconReport } from "./process/icons";
import { buildTokens, type Tokens } from "./process/tokens";
import type { RenderedPage, Viewport } from "./render";

export type KitItem = {
  kind: KitItemKind;
  name: string;
  source: string | null;
  licence: KitLicence;
  licence_name: string | null;
  alternative: string | null;
};

export type Imagery = RawDesign["imagery"] & { illustrations: number };

/** Everything a kit is generated from. `text` is used for analysis only and is never stored. */
export type Extraction = {
  source: { url: string; finalUrl: string; extractedAt: string; extractorVersion: number };
  tokens: Tokens;
  fonts: FontInfo[];
  icons: IconReport;
  components: ComponentVariant[];
  imagery: Imagery;
  items: KitItem[];
  frames: Frame[];
  text: RawDesign["text"];
};

// Probes the other colour scheme, if the site has one: through
// prefers-color-scheme and through the common class/attribute toggles.
async function collectOtherScheme(page: Page, raw: RawDesign, baseIsDark: boolean): Promise<RawDesign | null> {
  if (!raw.darkSchemeHints.length) return null;
  const target = baseIsDark ? "light" : "dark";
  const original = await page.evaluate(() => {
    const root = document.documentElement;
    return { className: root.className, theme: root.getAttribute("data-theme"), mode: root.getAttribute("data-mode") };
  });
  try {
    await page.emulateMedia({ colorScheme: target });
    if (raw.darkSchemeHints.includes("class")) {
      await page.evaluate((scheme) => {
        const root = document.documentElement;
        root.classList.remove(scheme === "dark" ? "light" : "dark", scheme === "dark" ? "theme-light" : "theme-dark");
        root.classList.add(scheme, `theme-${scheme}`);
        root.setAttribute("data-theme", scheme);
        root.setAttribute("data-mode", scheme);
      }, target);
    }
    await page.waitForTimeout(400);
    return await page.evaluate(collectDesign);
  } catch {
    return null;
  } finally {
    await page.emulateMedia({ colorScheme: baseIsDark ? "dark" : "light" }).catch(() => {});
    await page
      .evaluate((o) => {
        const root = document.documentElement;
        root.className = o.className;
        if (o.theme === null) root.removeAttribute("data-theme");
        else root.setAttribute("data-theme", o.theme);
        if (o.mode === null) root.removeAttribute("data-mode");
        else root.setAttribute("data-mode", o.mode);
      }, original)
      .catch(() => {});
  }
}

function licenceItems(fonts: FontInfo[], icons: IconReport, imagery: Imagery): KitItem[] {
  const items: KitItem[] = fonts.map((f) => ({
    kind: "font",
    name: f.family,
    source: f.source,
    licence: f.licence,
    licence_name: f.licenceName,
    alternative: f.alternative,
  }));
  if (icons.library) {
    items.push({
      kind: "icon_set",
      name: icons.library.name,
      source: icons.library.package,
      licence: icons.library.licence,
      licence_name: icons.library.licenceName,
      alternative: icons.library.alternative,
    });
    for (const name of icons.names.slice(0, 40)) {
      items.push({ kind: "icon", name, source: icons.library.package, licence: icons.library.licence, licence_name: icons.library.licenceName, alternative: icons.library.alternative });
    }
  }
  if (icons.customCount > 0) {
    items.push({ kind: "icon", name: `Custom icons (${icons.customCount})`, source: null, licence: "style_only", licence_name: null, alternative: "Lucide" });
  }
  if (icons.logoCount > 0) items.push({ kind: "logo", name: "Site logo", source: null, licence: "style_only", licence_name: null, alternative: null });
  if (imagery.images + imagery.backgroundImages + imagery.videos > 0) {
    items.push({ kind: "image", name: "Photography and images", source: null, licence: "style_only", licence_name: null, alternative: null });
  }
  if (imagery.illustrations > 0) {
    items.push({ kind: "illustration", name: `Illustrations (${imagery.illustrations})`, source: null, licence: "style_only", licence_name: null, alternative: null });
  }
  return items;
}

/**
 * Collects design data from each rendered viewport (plug `visit` into
 * renderSite), then `finish` turns it into one Extraction. Deterministic: no model.
 */
export function createExtractor(sourceUrl: string) {
  const raws: Partial<Record<Viewport["name"], RawDesign>> = {};
  const frames: Frame[] = [];
  let alternate: RawDesign | null = null;
  let components: ComponentVariant[] = [];

  async function visit({ page, viewport }: RenderedPage) {
    const raw = await page.evaluate(collectDesign);
    raws[viewport.name] = raw;
    if (viewport.name === "desktop") {
      components = await analyseComponents(page, raw.components);
      const backdrop = parseColor(raw.pageBackground);
      alternate = await collectOtherScheme(page, raw, backdrop ? luminance(backdrop) < 0.2 : false);
    }
    frames.push(await captureFrame(page, viewport));
  }

  function finish(finalUrl: string): Extraction {
    const { mobile, tablet, desktop } = raws;
    if (!desktop || !mobile || !tablet) throw new Error("extraction is missing a viewport");
    const tokens = buildTokens({ mobile, tablet, desktop }, alternate);
    const fonts = identifyFonts(tokens.typography, desktop);
    const icons = identifyIcons([desktop, mobile]);
    const illustrations = desktop.icons.svgs.filter((s) => !s.inLogo && (s.width > 48 || s.height > 48) && s.shapes >= 3).length;
    const imagery: Imagery = { ...desktop.imagery, illustrations };
    return {
      source: { url: sourceUrl, finalUrl, extractedAt: new Date().toISOString(), extractorVersion: EXTRACTOR_VERSION },
      tokens,
      fonts,
      icons,
      components,
      imagery,
      items: licenceItems(fonts, icons, imagery),
      frames: frames.sort((a, b) => b.width - a.width),
      text: {
        headings: [...new Set([...desktop.text.headings, ...mobile.text.headings])],
        paragraphs: [...new Set([...desktop.text.paragraphs, ...mobile.text.paragraphs])],
        actions: [...new Set([...desktop.text.actions, ...mobile.text.actions])],
      },
    };
  }

  return { visit, finish };
}
