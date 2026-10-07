"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Eye, Heart } from "@/components/icons";
import { cn } from "@/lib/utils";

type Stats = { views: number; likes: number; downloads: number; liked: boolean };

const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

// Views, likes and downloads for one kit, live. A view counts after the page
// has been on screen for two seconds; the server counts each person once.
export function KitStats({ slug, initial }: { slug: string; initial: { views: number; likes: number; downloads: number } }) {
  const [stats, setStats] = useState<Stats>({ ...initial, liked: false });
  const [pending, setPending] = useState(false);
  const [pop, setPop] = useState(0);
  const viewed = useRef(false);
  const url = `/api/kits/${encodeURIComponent(slug)}/stats`;

  useEffect(() => {
    let live = true;
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Stats | null) => live && data && setStats(data))
      .catch(() => {});

    const countView = () => {
      if (viewed.current || document.visibilityState !== "visible") return;
      viewed.current = true;
      fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "view" }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: Stats | null) => live && data && setStats(data))
        .catch(() => {});
    };
    const timer = setTimeout(countView, 2000);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [url]);

  const toggleLike = async () => {
    if (pending) return;
    setPending(true);
    const next = !stats.liked;
    setStats((s) => ({ ...s, liked: next, likes: Math.max(0, s.likes + (next ? 1 : -1)) }));
    if (next) setPop((p) => p + 1);
    const res = await fetch(url, { method: next ? "POST" : "DELETE", headers: { "content-type": "application/json" }, body: next ? JSON.stringify({ kind: "like" }) : undefined }).catch(() => null);
    const data = res?.ok ? ((await res.json()) as Stats) : null;
    if (data) setStats(data);
    setPending(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={toggleLike}
        aria-pressed={stats.liked}
        aria-label={stats.liked ? "Unlike this kit" : "Like this kit"}
        className={cn(
          "group inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-[background-color,border-color,color] duration-200",
          stats.liked ? "border-accent bg-accent-soft text-accent-soft-fg" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
        )}
      >
        <Heart key={pop} className={cn("size-4 transition-transform duration-200 group-active:scale-90", stats.liked && "fill-current text-accent-ink", pop > 0 && stats.liked && "animate-[like-pop_420ms_var(--ease-out-soft)]")} />
        <span className="tabular">{compact(stats.likes)}</span>
        <span className="sr-only">likes</span>
      </button>
      <span className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-fg-muted" title="People who opened this kit">
        <Eye className="size-4" /> <span className="tabular">{compact(stats.views)}</span>
        <span className="sr-only">views</span>
      </span>
      <span className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-fg-muted" title="People and agents who downloaded it">
        <Download className="size-4" /> <span className="tabular">{compact(stats.downloads)}</span>
        <span className="sr-only">downloads</span>
      </span>
    </div>
  );
}
