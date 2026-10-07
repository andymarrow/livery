"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@/components/icons";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { kitPath } from "@/lib/kit/urls";
import { cn } from "@/lib/utils";
import type { KitSourceView } from "@/services/kitRead";
import { DesignGlance } from "./DesignGlance";

// The links a combined kit was made from, side by side. Opening one shows
// its full design in a side panel; arrows step through the rest without ever
// leaving this page. "#source-2" in the address opens the second one, which
// is what the chips under the title link to.

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");
const pathOf = (url: string) => {
  const path = new URL(url).pathname;
  return path === "/" ? "Homepage" : path;
};
const index2 = (i: number) => String(i + 1).padStart(2, "0");

function mainRadius(source: KitSourceView) {
  const radii = source.tokens?.radii ?? [];
  if (radii.find((r) => r.px === "pill" && r.share >= 0.3)) return "pill";
  const top = [...radii].filter((r) => r.px !== "pill").sort((a, b) => b.share - a.share)[0];
  return top ? `${top.px}px` : null;
}

export function SourceExplorer({ sources, kind }: { sources: KitSourceView[]; kind: "site" | "taste" }) {
  const [open, setOpen] = useState<number | null>(null);
  const name = (s: KitSourceView) => (kind === "site" ? pathOf(s.url) : hostOf(s.url));

  const show = useCallback(
    (index: number | null) => {
      setOpen(index);
      const hash = index === null ? "" : `#source-${index + 1}`;
      if (window.location.hash !== hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    },
    [],
  );

  // The chips under the title are plain #source-N links.
  useEffect(() => {
    const fromHash = () => {
      const match = window.location.hash.match(/^#source-(\d)$/);
      const index = match ? Number(match[1]) - 1 : -1;
      if (index >= 0 && index < sources.length) setOpen(index);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [sources.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") show((open + 1) % sources.length);
      if (event.key === "ArrowLeft") show((open - 1 + sources.length) % sources.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sources.length, show]);

  const current = open === null ? null : sources[open];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {sources.map((source, index) => {
          const p = source.tokens?.palette;
          const strip = p ? [p.background, p.surface, p.text, p.accent].filter((c): c is string => Boolean(c)) : [];
          return (
            <button
              key={source.url}
              type="button"
              onClick={() => show(index)}
              className="group flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface text-left shadow-card transition-[border-color,transform] duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-border-strong focus-visible:border-accent focus-visible:outline-none"
            >
              <span className="flex h-14 border-b border-border" aria-hidden>
                {(strip.length ? strip : ["var(--surface-2)"]).map((colour, i) => (
                  <span key={`${colour}-${i}`} className="h-full transition-[flex-grow] duration-300 ease-out-soft group-hover:[&:last-child]:grow-[2]" style={{ background: colour, flexGrow: i === 0 ? 2 : 1 }} />
                ))}
              </span>
              <span className="flex flex-1 flex-col gap-2 p-3.5">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] text-fg-subtle">{index2(index)}</span>
                  <span className="truncate text-[13.5px] font-semibold tracking-tight">{name(source)}</span>
                </span>
                <span className="flex flex-wrap gap-1 text-[11px] text-fg-muted">
                  {p && <span className="rounded-full bg-surface-2 px-2 py-0.5 capitalize">{p.scheme}</span>}
                  {source.font && <span className="max-w-[8rem] truncate rounded-full bg-surface-2 px-2 py-0.5">{source.font}</span>}
                  {mainRadius(source) && <span className="rounded-full bg-surface-2 px-2 py-0.5">r {mainRadius(source)}</span>}
                </span>
                <span className="mt-auto pt-1 text-[11.5px] font-medium text-fg-subtle transition-colors group-hover:text-accent-ink">Look closer</span>
              </span>
            </button>
          );
        })}
      </div>

      <Sheet open={open !== null} onOpenChange={(next) => !next && show(null)}>
        <SheetContent className="w-[min(46rem,100vw)] overflow-y-auto">
          {current && open !== null && (
            <div className="px-5 pb-10 pt-5 sm:px-8">
              <div className="flex items-center gap-2 pr-12">
                <button type="button" onClick={() => show((open - 1 + sources.length) % sources.length)} aria-label="Previous" className="flex size-9 items-center justify-center rounded-full border border-border text-fg-muted transition-colors hover:border-border-strong hover:text-fg">
                  <ArrowLeft className="size-4" />
                </button>
                <button type="button" onClick={() => show((open + 1) % sources.length)} aria-label="Next" className="flex size-9 items-center justify-center rounded-full border border-border text-fg-muted transition-colors hover:border-border-strong hover:text-fg">
                  <ArrowRight className="size-4" />
                </button>
                <span className="ml-1 font-mono text-[12px] text-fg-subtle tabular">
                  {index2(open)} / {index2(sources.length - 1)}
                </span>
              </div>

              <div className="mt-2 flex gap-1" aria-hidden>
                {sources.map((s, i) => (
                  <span key={s.url} className={cn("h-0.5 flex-1 rounded-full transition-colors duration-300", i === open ? "bg-accent" : "bg-border")} />
                ))}
              </div>

              <div key={current.url} className="animate-rise">
                <SheetTitle className="mt-7 text-3xl font-bold tracking-tight">{name(current)}</SheetTitle>
                <p className="mt-1 text-[13px] text-fg-muted">{kind === "site" ? hostOf(current.url) : pathOf(current.url)} · its own kit, v{current.version}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={kitPath(current.slug, current.version)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-on-accent transition-opacity hover:opacity-90">
                    Open its kit <ArrowRight className="size-3.5" />
                  </Link>
                  <a href={current.url} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg">
                    Visit the site <ArrowUpRight className="size-3.5" />
                  </a>
                </div>
                <div className="mt-8">
                  {current.tokens ? <DesignGlance tokens={current.tokens} /> : <p className="text-sm text-fg-muted">This source&apos;s measurements are no longer available.</p>}
                </div>
                <p className="mt-8 border-t border-dashed border-border pt-4 text-[12px] text-fg-subtle">Use ← and → to step through the {kind === "site" ? "pages" : "sites"}.</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
