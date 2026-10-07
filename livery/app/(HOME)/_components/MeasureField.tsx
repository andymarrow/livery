"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/app/_context/ThemeContext";

// The hero's backdrop: a lattice of measuring marks, like a design tool's
// canvas. Near the pointer the marks grow and take the accent, and dashed
// inspector lines follow it with live coordinates. With no pointer, the
// crosshair drifts on its own. Every mark is a solid colour: no gradients.

const STEP = 30;
const REACH = 170;

export function MeasureField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const css = getComputedStyle(document.documentElement);
    const colour = { mark: css.getPropertyValue("--border-strong").trim(), accent: css.getPropertyValue("--accent").trim(), text: css.getPropertyValue("--fg-muted").trim() };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    let inside = false;
    let clock = 0;
    let last = performance.now();
    let presence = 0;
    const pointer = { x: 0, y: 0 };
    const lens = { x: 0, y: 0 };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      lens.x = width * 0.72;
      lens.y = height * 0.4;
      draw();
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const offsetX = (width % STEP) / 2;
      const offsetY = (height % STEP) / 2;

      for (let x = offsetX; x <= width; x += STEP) {
        for (let y = offsetY; y <= height; y += STEP) {
          const d = Math.hypot(x - lens.x, y - lens.y);
          const near = presence * Math.max(0, 1 - d / REACH);
          const size = 2 + near * 3.5;
          ctx.globalAlpha = 0.45 + near * 0.55;
          ctx.strokeStyle = near > 0.15 ? colour.accent : colour.mark;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(Math.round(x - size) + 0.5, Math.round(y) + 0.5);
          ctx.lineTo(Math.round(x + size) + 0.5, Math.round(y) + 0.5);
          ctx.moveTo(Math.round(x) + 0.5, Math.round(y - size) + 0.5);
          ctx.lineTo(Math.round(x) + 0.5, Math.round(y + size) + 0.5);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (presence < 0.02) return;

      // Inspector crosshair with a coordinate readout.
      ctx.globalAlpha = 0.5 * presence;
      ctx.strokeStyle = colour.accent;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(0, Math.round(lens.y) + 0.5);
      ctx.lineTo(width, Math.round(lens.y) + 0.5);
      ctx.moveTo(Math.round(lens.x) + 0.5, 0);
      ctx.lineTo(Math.round(lens.x) + 0.5, height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = presence;
      ctx.fillStyle = colour.accent;
      ctx.fillRect(Math.round(lens.x) - 2, Math.round(lens.y) - 2, 5, 5);
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = colour.text;
      ctx.textBaseline = "top";
      const label = `x ${Math.round(lens.x)}  y ${Math.round(lens.y)}`;
      const flip = lens.x > width - 120;
      ctx.textAlign = flip ? "right" : "left";
      ctx.fillText(label, Math.round(lens.x) + (flip ? -10 : 10), Math.round(lens.y) + 8);
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      const target = inside
        ? pointer
        : { x: width * (0.62 + 0.26 * Math.sin(clock * 0.21)), y: height * (0.42 + 0.3 * Math.sin(clock * 0.33 + 1.2)) };
      const ease = 1 - Math.exp(-dt / (inside ? 0.07 : 0.6));
      lens.x += (target.x - lens.x) * ease;
      lens.y += (target.y - lens.y) * ease;
      presence += ((inside ? 1 : 0.55) - presence) * (1 - Math.exp(-dt / 0.25));
      draw();
      if (visible) raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (reduced || raf || !visible) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      inside = true;
      start();
    };
    const onLeave = () => (inside = false);

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(host);
    resize();
    start();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [resolved]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
