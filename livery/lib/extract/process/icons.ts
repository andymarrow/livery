import type { KitLicence as Licence } from "@/lib/supabase/database.types";
import type { RawDesign, SvgInfo } from "../collect/collectDesign";

export type IconLibrary = { name: string; package: string; licence: Licence; licenceName: string; alternative: string | null };

const LIBRARIES: { test: RegExp; library: IconLibrary }[] = [
  { test: /\blucide\b/, library: { name: "Lucide", package: "lucide-react", licence: "free", licenceName: "ISC", alternative: null } },
  { test: /\bicon-tabler\b|\bti\b|\bti-/, library: { name: "Tabler Icons", package: "@tabler/icons-react", licence: "free", licenceName: "MIT", alternative: null } },
  { test: /\bph\b|\bph-/, library: { name: "Phosphor", package: "@phosphor-icons/react", licence: "free", licenceName: "MIT", alternative: null } },
  { test: /\bfa-(light|thin|duotone|sharp)\b|\bfal\b|\bfat\b|\bfad\b/, library: { name: "Font Awesome Pro", package: "@fortawesome/pro-*", licence: "licence_required", licenceName: "Commercial", alternative: "Font Awesome Free (@fortawesome/free-solid-svg-icons) or Lucide" } },
  { test: /\bfa-|\bfas\b|\bfar\b|\bfab\b|\bfa\b/, library: { name: "Font Awesome Free", package: "@fortawesome/free-solid-svg-icons", licence: "free", licenceName: "CC BY 4.0 (icons), MIT (code)", alternative: null } },
  { test: /\bbi\b|\bbi-/, library: { name: "Bootstrap Icons", package: "bootstrap-icons", licence: "free", licenceName: "MIT", alternative: null } },
  { test: /material-symbols|material-icons/, library: { name: "Material Symbols", package: "@material-symbols/svg-400", licence: "free", licenceName: "Apache-2.0", alternative: null } },
  { test: /\bri-/, library: { name: "Remix Icon", package: "@remixicon/react", licence: "free", licenceName: "Apache-2.0", alternative: null } },
  { test: /\bbx\b|\bbx-/, library: { name: "Boxicons", package: "boxicons", licence: "free", licenceName: "MIT", alternative: null } },
  { test: /\bfeather\b/, library: { name: "Feather", package: "react-feather", licence: "free", licenceName: "MIT", alternative: null } },
];

const ICONIFY_PREFIX: Record<string, IconLibrary> = {
  lucide: LIBRARIES[0].library,
  tabler: LIBRARIES[1].library,
  ph: LIBRARIES[2].library,
  mdi: { name: "Material Design Icons", package: "@mdi/js", licence: "free", licenceName: "Apache-2.0", alternative: null },
  heroicons: { name: "Heroicons", package: "@heroicons/react", licence: "free", licenceName: "MIT", alternative: null },
};

export type IconReport = {
  library: IconLibrary | null;
  confidence: "class-names" | "iconify" | "font-awesome-kit" | "drawing-style" | "none";
  names: string[];
  style: { sizePx: number | null; strokeWidth: number | null; linecap: string | null; filled: boolean; viewBox: string | null };
  customCount: number;
  logoCount: number;
};

function iconName(cls: string) {
  const m = cls.match(/\blucide-([a-z0-9-]+)|\bph-([a-z0-9-]+)|\bti-([a-z0-9-]+)|\bicon-tabler-([a-z0-9-]+)|\bfa-(?!solid|regular|light|thin|duotone|brands|sharp)([a-z0-9-]+)|\bbi-([a-z0-9-]+)|\bri-([a-z0-9-]+)/);
  return m ? m.slice(1).find(Boolean) ?? null : null;
}

const mode = <T,>(values: T[]) => {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

export function identifyIcons(raws: RawDesign[]): IconReport {
  const svgs: SvgInfo[] = raws.flatMap((r) => r.icons.svgs);
  const iconSvgs = svgs.filter((s) => !s.inLogo && s.width <= 48 && s.height <= 48 && s.width >= 10);
  const logoCount = new Set(svgs.filter((s) => s.inLogo).map((s) => `${s.viewBox}|${s.shapes}`)).size;
  const classes = [...new Set(raws.flatMap((r) => [...r.icons.iconClasses, ...r.icons.svgs.map((s) => `${s.classes} ${s.parentClasses}`)]))];
  const iconify = [...new Set(raws.flatMap((r) => r.icons.iconify))];
  const scripts = raws.flatMap((r) => [...r.scriptSources, ...r.stylesheetHrefs]);

  let library: IconLibrary | null = null;
  let confidence: IconReport["confidence"] = "none";
  const byClass = LIBRARIES.find(({ test }) => classes.some((c) => test.test(c)));
  if (byClass) {
    library = byClass.library;
    confidence = "class-names";
  } else if (iconify.length) {
    const prefix = mode(iconify.map((i) => i.split(":")[0]));
    if (prefix && ICONIFY_PREFIX[prefix]) {
      library = ICONIFY_PREFIX[prefix];
      confidence = "iconify";
    }
  } else if (scripts.some((s) => /kit\.fontawesome\.com|pro\.fontawesome\.com/.test(s))) {
    library = LIBRARIES[3].library;
    confidence = "font-awesome-kit";
  }

  const strokeWidths = iconSvgs.map((s) => parseFloat(s.strokeWidth)).filter((n) => n > 0 && n < 5);
  const filled = iconSvgs.filter((s) => s.fill && s.fill !== "none" && !/rgba\(0, 0, 0, 0\)/.test(s.fill)).length > iconSvgs.length / 2;
  const viewBox = mode(iconSvgs.map((s) => s.viewBox).filter(Boolean));
  const linecap = mode(iconSvgs.map((s) => s.linecap).filter(Boolean));
  const stroke = mode(strokeWidths);

  // Drawing style as a backup clue: Lucide/Feather draw on a 24 grid with round 2px strokes.
  if (!library && iconSvgs.length >= 3 && viewBox === "0 0 24 24" && linecap === "round" && !filled) {
    library = { ...LIBRARIES[0].library, name: "Lucide (closest match by drawing style)" };
    confidence = "drawing-style";
  }

  const names = [...new Set(classes.map(iconName).filter((n): n is string => Boolean(n)))].slice(0, 60);
  const sizes = iconSvgs.map((s) => Math.round(Math.max(s.width, s.height)));
  return {
    library,
    confidence,
    names,
    style: { sizePx: mode(sizes), strokeWidth: stroke, linecap, filled, viewBox },
    customCount: confidence === "class-names" || confidence === "iconify" ? 0 : new Set(iconSvgs.map((s) => `${s.viewBox}|${s.shapes}|${s.width}`)).size,
    logoCount,
  };
}
