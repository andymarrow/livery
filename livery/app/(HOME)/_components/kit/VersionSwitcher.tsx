"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { Check, LockKeyhole } from "@/components/icons";
import { cn } from "@/lib/utils";

export type VersionOption = { version: number; href: string; publishedAt: string; private: boolean; latest: boolean };

// The version you're on, as a menu of every version: the latest marked,
// private ones (owner only) marked, the current one checked.
export function VersionSwitcher({ current, options }: { current: number; options: VersionOption[] }) {
  const latest = options.find((o) => o.latest)?.version;
  const isLatest = current === latest;
  if (options.length <= 1) {
    return <span className="inline-flex h-7 items-center rounded-full bg-accent-soft px-2.5 text-[12px] font-semibold text-accent-soft-fg">v{current}{isLatest ? " · latest" : ""}</span>;
  }
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Version ${current}. Switch version`}
        className={cn(
          "group inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold outline-none ring-accent ring-offset-2 ring-offset-bg transition-colors focus-visible:ring-2",
          isLatest ? "bg-accent-soft text-accent-soft-fg hover:bg-accent hover:text-on-accent" : "bg-fg text-bg hover:opacity-90",
        )}
      >
        v{current}
        <span className="font-medium opacity-80">{isLatest ? "· latest" : `· of ${options.length}`}</span>
        <svg viewBox="0 0 12 12" className="size-3 transition-transform duration-150 group-data-[state=open]:rotate-180" aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-50 min-w-56 rounded-[14px] border border-border bg-surface p-1.5 shadow-card data-[state=open]:animate-rise">
          <DropdownMenu.Label className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">Versions</DropdownMenu.Label>
          {options.map((o) => (
            <DropdownMenu.Item key={o.version} asChild>
              <Link
                href={o.href}
                aria-current={o.version === current ? "page" : undefined}
                className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-surface-2"
              >
                <span className="flex size-4 items-center justify-center text-accent-ink">{o.version === current && <Check className="size-3.5" />}</span>
                <span className="font-mono font-semibold">v{o.version}</span>
                {o.latest && <span className="rounded-full bg-accent-soft px-1.5 py-px text-[10.5px] font-semibold text-accent-soft-fg">Latest</span>}
                {o.private && <LockKeyhole className="size-3.5 text-fg-subtle" aria-label="Private" />}
                <span className="ml-auto pl-4 text-[12px] text-fg-subtle">{o.publishedAt.slice(0, 10)}</span>
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
