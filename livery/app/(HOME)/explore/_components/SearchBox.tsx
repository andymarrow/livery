"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle as CircleNotch, Search as MagnifyingGlass, X } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

// Filters the library as you type (debounced), and "/" focuses it.
export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (value.trim() === current) return;
    const id = setTimeout(() => {
      const next = new URLSearchParams();
      if (value.trim()) next.set("q", value.trim());
      startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
    }, 250);
    return () => clearTimeout(id);
  }, [value, params, pathname, router]);

  return (
    <div className="relative w-full sm:max-w-sm">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">
        {pending ? <CircleNotch strokeWidth={2.25} className="size-4 animate-[spin_0.9s_linear_infinite]" /> : <MagnifyingGlass strokeWidth={2.25} className="size-4" />}
      </span>
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by domain"
        aria-label="Search kits by domain"
        className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-12 text-sm text-fg placeholder:text-fg-subtle transition-[border-color] hover:border-border-strong focus-visible:border-accent focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
        {value ? (
          <button type="button" onClick={() => setValue("")} aria-label="Clear search" className="flex size-6 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-2 hover:text-fg">
            <X strokeWidth={2.25} className="size-3.5" />
          </button>
        ) : (
          <Kbd>/</Kbd>
        )}
      </span>
    </div>
  );
}
