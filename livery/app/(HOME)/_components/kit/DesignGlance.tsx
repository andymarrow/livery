import type { Palette, Tokens } from "@/lib/extract/process/tokens";
import { MotionGlance } from "./MotionGlance";

const ROLES: [keyof Palette, string][] = [
  ["background", "Background"],
  ["surface", "Surface"],
  ["text", "Text"],
  ["textMuted", "Muted"],
  ["border", "Border"],
  ["accent", "Accent"],
];

function PaletteRow({ palette }: { palette: Palette }) {
  return (
    <div>
      <p className="label-micro mb-3 capitalize">{palette.scheme} theme</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ROLES.map(([key, label]) => {
          const value = palette[key] as string | null;
          if (!value) return null;
          return (
            <div key={key} className="overflow-hidden rounded-[14px] border border-border">
              <div className="h-14" style={{ background: value }} />
              <div className="border-t border-border bg-surface px-2.5 py-2">
                <p className="text-[12px] font-medium">{label}</p>
                <p className="font-mono text-[11px] text-fg-subtle">{value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The design at a glance: palettes, type scale, radii, spacing and motion style, straight from the measurements.
export function DesignGlance({ tokens }: { tokens: Tokens }) {
  const { typography, radii, spacing, palette, alternatePalette } = tokens;
  return (
    <div className="space-y-8 rounded-[18px] border border-border bg-surface p-5 sm:p-7 shadow-card">
      <PaletteRow palette={palette} />
      {alternatePalette && <PaletteRow palette={alternatePalette} />}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="label-micro mb-3">Type · {typography.families.display}{typography.families.body !== typography.families.display ? ` / ${typography.families.body}` : ""}</p>
          <div className="space-y-2.5">
            {typography.scale.slice(0, 6).map((step, index) => (
              <div key={`${step.name}-${step.sizePx}-${index}`} className="flex items-baseline gap-4">
                <span className="w-16 shrink-0 font-mono text-[11px] text-fg-subtle">{step.name}</span>
                <span
                  className="truncate text-fg"
                  style={{ fontSize: Math.min(step.sizePx, 40), fontWeight: step.weight, letterSpacing: `${step.letterSpacingEm}em`, lineHeight: 1.1 }}
                >
                  {step.sizePx}px Aa
                </span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-fg-subtle">{step.weight}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <p className="label-micro mb-3">Radius</p>
            <div className="flex flex-wrap gap-2">
              {radii.map((r) => (
                <div key={String(r.px)} className="flex flex-col items-center gap-1.5">
                  <span className="size-10 border border-border-strong bg-surface-2" style={{ borderRadius: r.px === "pill" ? 9999 : Math.min(r.px, 20) }} />
                  <span className="font-mono text-[10.5px] text-fg-subtle">{r.px === "pill" ? "pill" : `${r.px}px`}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="label-micro mb-3">Spacing · {spacing.base ? `${spacing.base}px grid` : "irregular"}</p>
            <div className="flex items-end gap-1.5">
              {spacing.values.slice(0, 10).map((v) => (
                <span key={v} className="w-3 rounded-sm bg-accent/70" style={{ height: Math.max(4, Math.min(v, 64)) }} title={`${v}px`} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <MotionGlance motion={tokens.motion} />
    </div>
  );
}
