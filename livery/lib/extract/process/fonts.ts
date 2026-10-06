import googleFonts from "@/data/google-fonts.json";
import { COMMERCIAL_FONTS, SYSTEM_FAMILIES } from "@/data/commercialFonts";
import type { KitLicence as Licence } from "@/lib/supabase/database.types";
import type { RawDesign } from "../collect/collectDesign";
import type { Typography } from "./tokens";

const GOOGLE = new Map((googleFonts as string[]).map((family) => [family.toLowerCase(), family]));

export type FontInfo = {
  family: string;
  roles: ("body" | "display" | "mono")[];
  licence: Licence;
  licenceName: string | null;
  source: string | null;
  install: string | null;
  alternative: string | null;
  note: string;
};

const clean = (family: string) => family.replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
// Next.js and other tooling rename fonts ("__Inter_d65c78", "Inter Fallback").
const unwrap = (family: string) =>
  clean(family)
    .replace(/^__/, "")
    .replace(/_[0-9a-f]{5,}$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+(fallback|variable|var)$/i, "")
    .trim();

function genericAlternative(roles: FontInfo["roles"]) {
  if (roles.includes("mono")) return "JetBrains Mono";
  return "Inter";
}

export function identifyFont(rawFamily: string, roles: FontInfo["roles"], raw: RawDesign): FontInfo {
  const family = unwrap(rawFamily);
  const key = family.toLowerCase();
  const typekit = raw.stylesheetHrefs.some((h) => /use\.typekit\.net|p\.typekit\.net/.test(h));

  if (SYSTEM_FAMILIES.has(key)) {
    return { family, roles, licence: "free", licenceName: "System font", source: "system", install: null, alternative: null, note: "Ships with the operating system; nothing to install." };
  }
  const google = GOOGLE.get(key);
  if (google) {
    const slug = google.toLowerCase().replace(/\s+/g, "-");
    return {
      family: google,
      roles,
      licence: "free",
      licenceName: "SIL Open Font License (Google Fonts)",
      source: "google-fonts",
      install: `next/font/google (${google.replace(/\s+/g, "_")}) or npm i @fontsource-variable/${slug}`,
      alternative: null,
      note: "Install from Google Fonts or Fontsource, never from the source site.",
    };
  }
  const commercial = COMMERCIAL_FONTS[key];
  if (commercial || typekit) {
    const alternative = commercial?.alternative ?? genericAlternative(roles);
    return {
      family,
      roles,
      licence: "licence_required",
      licenceName: commercial ? `Commercial (${commercial.foundry})` : "Adobe Fonts",
      source: commercial ? commercial.foundry : "adobe-fonts",
      install: null,
      alternative,
      note: `Use only with your own licence. Otherwise use ${alternative}.`,
    };
  }
  return {
    family,
    roles,
    licence: "style_only",
    licenceName: null,
    source: null,
    install: null,
    alternative: genericAlternative(roles),
    note: "A custom or unidentified typeface. Recreate its feel with the suggested free family.",
  };
}

export function identifyFonts(typography: Typography, raw: RawDesign): FontInfo[] {
  const roles = new Map<string, FontInfo["roles"]>();
  const add = (family: string | null, role: FontInfo["roles"][number]) => {
    if (!family) return;
    roles.set(family, [...(roles.get(family) ?? []), role]);
  };
  add(typography.families.body, "body");
  add(typography.families.display, "display");
  add(typography.families.mono, "mono");
  return [...roles.entries()].map(([family, r]) => identifyFont(family, [...new Set(r)], raw));
}
