"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "@/components/icons";
import { cn } from "@/lib/utils";

// The content-removed frames, shown the way the site is meant to be seen: the
// desktop (or tablet) page in a screen-shaped window you scroll inside, with a
// map of the whole page beside it, and the phone layout in a phone-shaped
// window next to it.

export type FrameView = { name: "desktop" | "tablet" | "mobile"; url: string; width: number; height: number };

const SCREEN: Record<FrameView["name"], { label: string; viewport: number }> = {
  desktop: { label: "Desktop", viewport: 900 },
  tablet: { label: "Tablet", viewport: 1180 },
  mobile: { label: "Phone", viewport: 844 },
};

function useScrollWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ top: 0, size: 1 });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || !el.scrollHeight) return;
    setView({ top: el.scrollTop / el.scrollHeight, size: Math.min(1, el.clientHeight / el.scrollHeight) });
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);
  return { ref, view, measure };
}

export function FrameViewer({ frames, title }: { frames: FrameView[]; title: string }) {
  const screens = frames.filter((f) => f.name !== "mobile");
  const phone = frames.find((f) => f.name === "mobile") ?? null;
  const [active, setActive] = useState<FrameView["name"]>(screens[0]?.name ?? "desktop");
  const current = screens.find((f) => f.name === active) ?? screens[0] ?? null;
  const { ref: mainRef, view: mainView, measure: measureMain } = useScrollWindow();
  const { ref: phoneRef, view: phoneView, measure: measurePhone } = useScrollWindow();
  const map = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    measureMain();
  }, [active, mainRef, measureMain]);

  // Click or drag on the page map to move the window there.
  const jump = (clientY: number) => {
    const el = mainRef.current;
    const box = map.current?.getBoundingClientRect();
    if (!el || !box) return;
    const ratio = Math.min(1, Math.max(0, (clientY - box.top) / box.height));
    el.scrollTo({ top: ratio * el.scrollHeight - el.clientHeight / 2, behavior: dragging.current ? "auto" : "smooth" });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      {current && (
        <div className="overflow-hidden rounded-[18px] border border-border bg-surface shadow-card">
          <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
            {screens.length > 1 ? (
              <div className="flex gap-0.5 rounded-full bg-surface-2 p-0.5">
                {screens.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setActive(f.name)}
                    aria-pressed={active === f.name}
                    className={cn("h-7 rounded-full px-3 text-[12.5px] font-medium transition-colors", active === f.name ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg")}
                  >
                    {SCREEN[f.name].label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="px-1 text-[12.5px] font-medium">{SCREEN[current.name].label}</span>
            )}
            <span className="font-mono text-[11px] text-fg-subtle">{current.width}px wide</span>
            <a href={current.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-fg-muted transition-colors hover:text-fg">
              Full page <ArrowUpRight className="size-3.5" />
            </a>
          </div>
          <div className="flex">
            <div
              id="frame-main"
              ref={mainRef}
              onScroll={measureMain}
              className="no-scrollbar relative min-w-0 flex-1 overflow-y-auto bg-surface-2"
              style={{ aspectRatio: `${current.width} / ${Math.min(SCREEN[current.name].viewport, current.height)}`, maxHeight: "70vh" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
              <img key={current.url} src={current.url} alt={`${SCREEN[current.name].label} layout of ${title}, content removed`} width={current.width} height={current.height} onLoad={measureMain} className="block h-auto w-full" />
            </div>
            <div
              ref={map}
              role="scrollbar"
              aria-label="Page map"
              aria-controls="frame-main"
              aria-valuenow={Math.round(mainView.top * 100)}
              tabIndex={0}
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                jump(e.clientY);
              }}
              onPointerMove={(e) => dragging.current && jump(e.clientY)}
              onPointerUp={() => (dragging.current = false)}
              onKeyDown={(e) => {
                const el = mainRef.current;
                if (!el) return;
                if (e.key === "ArrowDown") el.scrollBy({ top: el.clientHeight * 0.8, behavior: "smooth" });
                if (e.key === "ArrowUp") el.scrollBy({ top: -el.clientHeight * 0.8, behavior: "smooth" });
              }}
              className="relative hidden w-16 shrink-0 cursor-pointer select-none self-start border-l border-border bg-surface p-1.5 sm:block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- same frame, as a map */}
              <img src={current.url} alt="" draggable={false} className="block h-auto w-full opacity-80" />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-1 rounded-[3px] border border-accent bg-accent/10 transition-[top] duration-75"
                style={{ top: `calc(0.375rem + ${mainView.top} * (100% - 0.75rem))`, height: `calc(${mainView.size} * (100% - 0.75rem))` }}
              />
            </div>
          </div>
        </div>
      )}

      {phone && (
        <figure className="mx-auto w-full max-w-[17rem]">
          <div className="rounded-[2.4rem] border border-border bg-surface p-2 shadow-card">
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface-2">
              <div ref={phoneRef} onScroll={measurePhone} className="no-scrollbar overflow-y-auto" style={{ aspectRatio: `${phone.width} / ${Math.min(SCREEN.mobile.viewport, phone.height)}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
                <img src={phone.url} alt={`Phone layout of ${title}, content removed`} width={phone.width} height={phone.height} onLoad={measurePhone} className="block h-auto w-full" />
              </div>
              <span aria-hidden className="pointer-events-none absolute right-1 top-0 h-full w-0.5">
                <span className="absolute w-full rounded-full bg-fg/25" style={{ top: `${phoneView.top * 100}%`, height: `${phoneView.size * 100}%` }} />
              </span>
            </div>
          </div>
          <figcaption className="mt-3 flex items-center justify-between px-2 text-[12px] text-fg-subtle">
            <span>
              Phone · <span className="font-mono">{phone.width}px</span>
            </span>
            <a href={phone.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-fg">
              Full page <ArrowUpRight className="size-3" />
            </a>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
