import "server-only";
import { EXTRACTOR_VERSION } from "@/constants/constants";
import type { StoredSource } from "@/lib/combine/merge";
import type { VoiceProfile } from "@/lib/generate/measured";
import type { RawDesign } from "./collect/collectDesign";
import { licenceItems, type Imagery } from "./index";
import { groupComponents } from "./process/components";
import { identifyFonts } from "./process/fonts";
import { identifyIcons } from "./process/icons";
import { buildTokens } from "./process/tokens";

/**
 * A page measured in the user's own browser (the extension), turned into the
 * same stored shape a server build produces. One viewport only, so it stands
 * in for all three widths, and components have no hover or focus states. The
 * page's text is never kept: copy arrives, if at all, only as voice numbers.
 */
export function captureToSource(raw: RawDesign, url: string, voice: VoiceProfile | undefined): StoredSource {
  const clean: RawDesign = { ...raw, text: { headings: [], paragraphs: [], actions: [] } };
  const tokens = buildTokens({ mobile: clean, tablet: clean, desktop: clean }, null);
  const fonts = identifyFonts(tokens.typography, clean);
  const icons = identifyIcons([clean]);
  const illustrations = clean.icons.svgs.filter((s) => !s.inLogo && (s.width > 48 || s.height > 48) && s.shapes >= 3).length;
  const imagery: Imagery = { ...clean.imagery, illustrations };
  return {
    source: { url, finalUrl: url, extractedAt: new Date().toISOString(), extractorVersion: EXTRACTOR_VERSION },
    tokens,
    fonts,
    icons,
    components: groupComponents(clean.components),
    imagery,
    items: licenceItems(fonts, icons, imagery),
    voice,
  };
}
