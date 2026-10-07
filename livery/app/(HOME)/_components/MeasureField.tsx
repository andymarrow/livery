"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/app/_context/ThemeContext";

// The hero's backdrop: a quiet lattice of measuring marks, like a design
// tool's canvas. The few marks right under the pointer lift a little and
// fade back when it leaves. Nothing moves on its own.

const STEP = 32;
const REACH = 96;

export function MeasureField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const css = getComputedStyle(document.documentElement);
    const colour = { mark: css.getPropertyValue("--border-strong").trim(), near: css.getPropertyValue("--fg-subtle").trim() };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let inside = false;
    let presence = 0;
    let last = performance.now();
    const pointer = { x: -999, y: -999 };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw();
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const offsetX = (width % STEP) / 2;
      const offsetY = (height % STEP) / 2;
      ctx.lineWidth = 1;
      for (let x = offsetX; x <= width; x += STEP) {
        for (let y = offsetY; y <= height; y += STEP) {
          const near = presence * Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / REACH) ** 2;
          const size = 2 + near * 1.5;
          ctx.globalAlpha = 0.4 + near * 0.4;
          ctx.strokeStyle = near > 0.2 ? colour.near : colour.mark;
          ctx.beginPath();
          ctx.moveTo(Math.round(x - size) + 0.5, Math.round(y) + 0.5);
          ctx.lineTo(Math.round(x + size) + 0.5, Math.round(y) + 0.5);
          ctx.moveTo(Math.round(x) + 0.5, Math.round(y - size) + 0.5);
          ctx.lineTo(Math.round(x) + 0.5, Math.round(y + size) + 0.5);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = inside ? 1 : 0;
      presence += (target - presence) * (1 - Math.exp(-dt / 0.2));
      draw();
      if (Math.abs(target - presence) > 0.005) raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (reduced || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = host.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      inside = true;
      if (!raf) {
        if (presence > 0.995) draw();
        else start();
      }
    };
    const onLeave = () => {
      inside = false;
      start();
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [resolved]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
