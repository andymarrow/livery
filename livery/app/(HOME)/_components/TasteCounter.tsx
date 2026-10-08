"use client";

import Link from "next/link";
import { Popover } from "radix-ui";
import { ArrowRight, X } from "@/components/icons";
import { TASTE_MAX, useTasteTray } from "@/lib/kit/tasteTray";
import { cn } from "@/lib/utils";

const nameOf = (url: string) => {
  try {
    const u = new URL(url);
    return { host: u.hostname.replace(/^www\./, ""), path: u.pathname === "/" ? "" : u.pathname };
  } catch {
    return { host: url, path: "" };
  }
};

// Appears in the header once a visitor starts collecting sites for a taste:
// one dot per site. It opens the collection itself: every site with its own
// remove button, a way to start over, and a way straight to building it.
export function TasteCounter() {
  const { links, remove, clear } = useTasteTray();
  if (!links.length) return null;
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Your taste: ${links.length} ${links.length === 1 ? "site" : "sites"}. Open it`}
        className="animate-rise group inline-flex h-9 items-center gap-2 rounded-full border border-accent/50 bg-surface pl-3 pr-3.5 text-[13px] font-medium text-fg outline-none transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent data-[state=open]:border-accent"
      >
        <span className="flex items-center gap-0.5" aria-hidden>
          {Array.from({ length: TASTE_MAX }, (_, i) => (
            <span key={i} className={cn("size-1.5 rounded-full transition-colors duration-300", i < links.length ? "bg-accent" : "bg-border-strong")} />
          ))}
        </span>
        <span className="hidden whitespace-nowrap sm:inline lg:hidden">Your taste</span>
        <span className="tabular text-fg-muted">{links.length}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-[16px] border border-border bg-surface p-2 shadow-card data-[state=open]:animate-rise">
          <div className="flex items-baseline justify-between px-2.5 pb-2 pt-1.5">
            <p className="text-[13px] font-semibold">Your taste</p>
            <p className="font-mono text-[11px] text-fg-subtle">
              {links.length} of {TASTE_MAX}
            </p>
          </div>
          <ul className="space-y-0.5">
            {links.map((url) => {
              const { host, path } = nameOf(url);
              return (
                <li key={url} className="group/item flex items-center gap-2 rounded-[10px] py-1.5 pl-2.5 pr-1 hover:bg-surface-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    {host}
                    {path && <span className="text-fg-subtle">{path}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(url)}
                    aria-label={`Remove ${host}${path} from your taste`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-[8px] text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="px-2.5 pt-2 text-[12px] leading-relaxed text-fg-subtle">
            {links.length < 2 ? "Add at least one more site to make a taste." : "Tap + Taste on any kit to add more, or build it now."}
          </p>
          <div className="mt-2 flex items-center gap-2 border-t border-border px-1 pt-2">
            <button type="button" onClick={clear} className="h-8 rounded-full px-3 text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">
              Clear all
            </button>
            <Popover.Close asChild>
              <Link
                href="/create?kind=taste"
                aria-disabled={links.length < 2}
                className={cn(
                  "ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[12.5px] font-semibold text-on-accent transition-opacity hover:opacity-90",
                  links.length < 2 && "pointer-events-none opacity-50",
                )}
              >
                Build the taste <ArrowRight className="size-3.5" />
              </Link>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
