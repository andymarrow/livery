"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTasteTray } from "@/lib/kit/tasteTray";
import { cn } from "@/lib/utils";

// Appears in the header once a visitor starts collecting sites for a taste:
// one dot per site, and a way straight to building it.
export function TasteCounter() {
  const { links } = useTasteTray();
  const pathname = usePathname();
  if (!links.length || pathname === "/create") return null;
  return (
    <Link
      href="/create?kind=taste"
      aria-label={`Your taste: ${links.length} ${links.length === 1 ? "site" : "sites"}. Build it`}
      className="animate-rise group inline-flex h-9 items-center gap-2 rounded-full border border-accent/50 bg-surface pl-3 pr-3.5 text-[13px] font-medium text-fg transition-colors hover:border-accent"
    >
      <span className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cn("size-1.5 rounded-full transition-colors duration-300", i < links.length ? "bg-accent" : "bg-border-strong")} />
        ))}
      </span>
      <span className="hidden sm:inline">Your taste</span>
      <span className="tabular text-fg-muted">{links.length}</span>
    </Link>
  );
}
