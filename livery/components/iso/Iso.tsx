import { cn } from "@/lib/utils";

// A tiny isometric drawing kit for page illustrations, in a hairline style:
// thin strokes that stay thin at any size, flat fills, one accent, callouts
// in mono. Lines draw themselves in once; a slow highlight passes from part
// to part. Pure SVG and CSS (see .iso in globals.css); reduced motion stops it.

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;

/** World (x, y, z) to screen (x, y). x runs down-right, y down-left, z up. */
export function iso(x: number, y: number, z = 0): [number, number] {
  return [Math.round((x - y) * COS * 100) / 100, Math.round(((x + y) * SIN - z) * 100) / 100];
}

const pts = (list: [number, number, number][]) => list.map(([x, y, z]) => iso(x, y, z).join(",")).join(" ");

type Tone = "plain" | "hot" | "soft";
type Common = { tone?: Tone; delay?: number; /** Position in the highlight cycle (0..n-1), or none. */ pulse?: number; className?: string };

const toneClass = (tone: Tone = "plain") => (tone === "hot" ? "iso-hot" : tone === "soft" ? "iso-soft" : "");
const style = (delay = 0, pulse?: number) => ({ "--d": `${delay}ms`, ...(pulse !== undefined ? { "--p": pulse } : {}) }) as React.CSSProperties;

/** A box: its top and the two faces that show. */
export function Box({ x, y, z = 0, w, d, h, tone, delay, pulse, className, children }: Common & { x: number; y: number; z?: number; w: number; d: number; h: number; children?: React.ReactNode }) {
  return (
    <g className={cn("iso-shape", toneClass(tone), pulse !== undefined && "iso-pulse", className)} style={style(delay, pulse)}>
      <polygon className="iso-side" points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} />
      <polygon className="iso-side iso-side-r" points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} />
      <polygon className="iso-top" points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} />
      {children}
    </g>
  );
}

/** Lines drawn on a box's top face, in its own units (for content, grids, bars). */
export function TopLines({ x, y, z, lines, tone = "soft", delay = 0 }: { x: number; y: number; z: number; lines: [number, number, number, number][]; tone?: Tone; delay?: number }) {
  return (
    <g className={cn("iso-lines", toneClass(tone))}>
      {lines.map(([x1, y1, x2, y2], i) => {
        const [a, b] = iso(x + x1, y + y1, z);
        const [c, e] = iso(x + x2, y + y2, z);
        return <path key={i} d={`M${a},${b}L${c},${e}`} pathLength={1} className="iso-draw" style={style(delay + i * 60)} />;
      })}
    </g>
  );
}

/** A cylinder (a stack of records, a token, a dial). */
export function Cylinder({ x, y, z = 0, r, h, tone, delay, pulse, className }: Common & { x: number; y: number; z?: number; r: number; h: number }) {
  const [cx, cy] = iso(x, y, z);
  const rx = r * Math.SQRT2 * COS;
  const ry = r * Math.SQRT2 * SIN;
  return (
    <g className={cn("iso-shape", toneClass(tone), pulse !== undefined && "iso-pulse", className)} style={style(delay, pulse)}>
      <path className="iso-side" d={`M${cx - rx},${cy}L${cx - rx},${cy - h}A${rx} ${ry} 0 0 0 ${cx + rx},${cy - h}L${cx + rx},${cy}A${rx} ${ry} 0 0 1 ${cx - rx},${cy}Z`} />
      <ellipse className="iso-top" cx={cx} cy={cy - h} rx={rx} ry={ry} />
    </g>
  );
}

/** A path through world points, drawn in once (routes, wires, arrows). */
export function Wire({ points, tone = "plain", delay = 0, dashed = false }: { points: [number, number, number][]; tone?: Tone; delay?: number; dashed?: boolean }) {
  const d = points.map((p, i) => `${i ? "L" : "M"}${iso(...p).join(",")}`).join("");
  if (dashed) return <path d={d} className={cn("iso-wire iso-dashed", toneClass(tone))} style={style(delay)} />;
  return <path d={d} pathLength={1} className={cn("iso-wire iso-draw", toneClass(tone))} style={style(delay)} />;
}

/**
 * A label with a leader line, farmjs-style: a dot on the part, a line out to
 * the side, a small square and mono text. `side` picks where the text sits.
 */
export function Callout({ at, plate, label, side = "right", dy = 0, tone = "plain", delay = 0 }: { at: [number, number, number]; /** The scene's plate [w, d]: labels sit just outside it. */ plate: [number, number]; label: string; side?: "left" | "right"; /** Moves the label up or down so labels on one side never touch. */ dy?: number; tone?: Tone; delay?: number }) {
  const [ax, ay] = iso(...at);
  const end = side === "right" ? plate[0] * COS + 16 : -plate[1] * COS - 16;
  const ly = ay + dy;
  const elbow = end + (side === "right" ? -8 : 8);
  return (
    <g className={cn("iso-callout", toneClass(tone))} style={style(delay)}>
      <path d={`M${ax},${ay}L${elbow},${ly}L${end},${ly}`} pathLength={1} className="iso-draw" style={style(delay)} />
      <circle cx={ax} cy={ay} r={1.7} />
      <rect x={end - 1.5} y={ly - 1.5} width={3} height={3} />
      <text x={side === "right" ? end + 5 : end - 5} y={ly + 2.6} textAnchor={side === "right" ? "start" : "end"}>
        {label}
      </text>
    </g>
  );
}

/** The scene: a responsive SVG that never overflows its column. */
export function IsoScene({ plate, top, label, pulses = 4, className, children }: { /** The base plate [w, d]; the frame is worked out from it. */ plate: [number, number]; /** The highest z in the scene. */ top: number; label: string; /** How many parts take turns in the highlight. */ pulses?: number; className?: string; children: React.ReactNode }) {
  const [w, d] = plate;
  const left = -d * COS - 128;
  const right = w * COS + 128;
  const topY = -top - 16;
  const bottom = (w + d) * SIN + 10;
  const viewBox = `${Math.floor(left)} ${Math.floor(topY)} ${Math.ceil(right - left)} ${Math.ceil(bottom - topY)}`;
  return (
    <svg viewBox={viewBox} role="img" aria-label={label} className={cn("iso h-auto w-full overflow-visible", className)} style={{ "--n": pulses } as React.CSSProperties}>
      {children}
    </svg>
  );
}
