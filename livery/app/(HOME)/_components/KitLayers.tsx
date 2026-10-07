"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// A kit's five areas as an isometric stack, in the order an agent applies
// them (tokens at the base). Hairline drawing; point at a layer to lift it.
// When idle, the highlight walks up the stack on its own.

const LAYERS = [
  { name: "tokens", detail: "colour, type, spacing, radii" },
  { name: "components", detail: "buttons, cards, inputs, states" },
  { name: "layout", detail: "containers, grids, rhythm" },
  { name: "motion", detail: "durations, easing, reveals" },
  { name: "voice", detail: "tone, casing, button copy" },
];

const W = 112; // half width of a plate
const H = 56; // half height (2:1 isometric)
const T = 7; // plate thickness
const GAP = 29;
const BASE = 76;

const diamond = (cy: number, w = W, h = H) => `0,${cy - h} ${w},${cy} 0,${cy + h} ${-w},${cy}`;
const rightSide = (cy: number) => `${W},${cy} 0,${cy + H} 0,${cy + H + T} ${W},${cy + T}`;
const leftSide = (cy: number) => `${-W},${cy} 0,${cy + H} 0,${cy + H + T} ${-W},${cy + T}`;

// Small marks on each plate's top face, so every layer reads differently.
function Marks({ index, cy }: { index: number; cy: number }) {
  const iso = (x: number, y: number) => `${x - y},${cy + (x + y) / 2}`;
  switch (index) {
    case 0: // swatches
      return (
        <g>
          {[-36, -12, 12, 36].map((x, i) => (
            <polygon key={x} points={`${iso(x - 8, -8)} ${iso(x + 8, -8)} ${iso(x + 8, 8)} ${iso(x - 8, 8)}`} className={i === 3 ? "fill-accent/70" : "fill-border-strong/70"} />
          ))}
        </g>
      );
    case 1: // a pill and a card
      return (
        <g className="fill-none stroke-current" strokeWidth={0.9}>
          <polygon points={`${iso(-40, -14)} ${iso(-2, -14)} ${iso(-2, 2)} ${iso(-40, 2)}`} />
          <polygon points={`${iso(8, -26)} ${iso(44, -26)} ${iso(44, 18)} ${iso(8, 18)}`} />
        </g>
      );
    case 2: // a grid
      return (
        <g className="fill-none stroke-current" strokeWidth={0.8}>
          {[-30, 0, 30].map((x) => (
            <polyline key={x} points={`${iso(x, -40)} ${iso(x, 40)}`} />
          ))}
          {[-20, 20].map((y) => (
            <polyline key={y} points={`${iso(-46, y)} ${iso(46, y)}`} />
          ))}
        </g>
      );
    case 3: // an easing curve
      return (
        <path
          d={`M${iso(-44, 30).replace(",", " ")} C${iso(-10, 30).replace(",", " ")} ${iso(-6, -30).replace(",", " ")} ${iso(44, -30).replace(",", " ")}`}
          className="fill-none stroke-current"
          strokeWidth={1}
        />
      );
    default: // lines of copy
      return (
        <g className="fill-none stroke-current" strokeWidth={1} strokeLinecap="round">
          {[-22, -6, 10].map((y, i) => (
            <polyline key={y} points={`${iso(-40, y)} ${iso(i === 2 ? 10 : 40, y)}`} />
          ))}
        </g>
      );
  }
}

export function KitLayers() {
  const [active, setActive] = useState(0);
  const pointing = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!pointing.current) setActive((i) => (i + 1) % LAYERS.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const centre = (i: number) => BASE - i * GAP;
  const layer = LAYERS[active];

  return (
    <figure className="w-full">
      <svg
        viewBox="-126 -114 366 264"
        className="w-full select-none"
        role="img"
        aria-label="A kit's five areas stacked: tokens, components, layout, motion, voice"
        onPointerLeave={() => (pointing.current = false)}
      >
        {LAYERS.map((l, i) => {
          const on = i === active;
          const cy = centre(i);
          return (
            <g
              key={l.name}
              onPointerEnter={() => {
                pointing.current = true;
                setActive(i);
              }}
              className={cn("cursor-default transition-[transform,opacity] duration-300 ease-out-soft", on ? "-translate-y-[7px]" : "", i > active ? "opacity-45" : "opacity-100")}
            >
              <polygon points={leftSide(cy)} className={cn("transition-colors duration-300", on ? "fill-accent-soft stroke-accent" : "fill-surface-2 stroke-border-strong")} strokeWidth={0.8} />
              <polygon points={rightSide(cy)} className={cn("transition-colors duration-300", on ? "fill-accent-soft stroke-accent" : "fill-surface-3 stroke-border-strong")} strokeWidth={0.8} />
              <polygon points={diamond(cy)} className={cn("transition-colors duration-300", on ? "fill-surface stroke-accent" : "fill-surface stroke-border-strong")} strokeWidth={on ? 1.1 : 0.8} />
              <polygon points={diamond(cy, W - 10, H - 5)} className="fill-none stroke-border" strokeWidth={0.6} strokeDasharray="2 3" />
              <g className={cn("transition-colors duration-300", on ? "text-accent" : "text-fg-subtle")}>
                <Marks index={i} cy={cy} />
              </g>
            </g>
          );
        })}

        {/* Callout: a hairline from the lifted layer to its label */}
        <g className="transition-transform duration-300 ease-out-soft" style={{ transform: `translateY(${centre(active) - 7}px)` }}>
          <polyline points={`${W - 2},0 ${W + 26},0`} className="fill-none stroke-accent" strokeWidth={0.9} />
          <circle cx={W - 2} cy={0} r={2.2} className="fill-surface stroke-accent" strokeWidth={0.9} />
          <rect x={W + 30} y={-2.5} width={5} height={5} className="fill-accent" />
          <text x={W + 40} y={1} className="fill-fg font-mono" style={{ fontSize: 9.5 }} dominantBaseline="middle">
            {String(active + 1).padStart(2, "0")} {layer.name}
          </text>
        </g>
      </svg>
      <figcaption className="mt-2 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wide">
        <span className="text-fg-subtle">Point at a layer</span>
        <span className="truncate normal-case text-fg-muted">{layer.detail}</span>
      </figcaption>
    </figure>
  );
}
