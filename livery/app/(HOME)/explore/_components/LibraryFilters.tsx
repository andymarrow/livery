"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, LoaderCircle, Moon, Sun, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ColourFamily, LibraryFacets } from "@/services/kitRead";

// Every way to narrow the library, kept in the URL so a filtered view can be
// shared or bookmarked. Each control changes one parameter and keeps the rest.

const SHELVES = [
  ["all", "All kits"],
  ["sites", "Sites"],
  ["tastes", "Tastes"],
] as const;

const SORTS = [
  ["newest", "Newest"],
  ["liked", "Most liked"],
  ["downloaded", "Most downloaded"],
  ["viewed", "Most viewed"],
] as const;

// Display swatches for each colour family (category markers, not site colours).
const FAMILY: Record<ColourFamily, { label: string; hex: string }> = {
  red: { label: "Red", hex: "#e5484d" },
  orange: { label: "Orange", hex: "#f76b15" },
  yellow: { label: "Yellow", hex: "#f5c400" },
  green: { label: "Green", hex: "#30a46c" },
  teal: { label: "Teal", hex: "#12a594" },
  blue: { label: "Blue", hex: "#0090ff" },
  purple: { label: "Purple", hex: "#8e4ec6" },
  pink: { label: "Pink", hex: "#d6409f" },
  neutral: { label: "No accent", hex: "#8b8d98" },
};

const selectClass =
  "h-9 max-w-[12rem] cursor-pointer appearance-none truncate rounded-full border bg-surface pl-3.5 pr-8 text-[13px] font-medium transition-colors hover:border-border-strong focus-visible:border-accent focus-visible:outline-none";

export function LibraryFilters({ facets, curatorName }: { facets: LibraryFacets | null; curatorName: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const get = (key: string) => params.get(key) ?? "";
  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  const shelf = get("by") ? "tastes" : get("shelf") || "all";
  const sort = get("sort") || "newest";
  const active = ["scheme", "colour", "font", "icons", "approved", "by"].filter((k) => get(k));
  const colours = (Object.keys(FAMILY) as ColourFamily[]).filter((c) => facets?.colours[c]);

  return (
    <div className="mt-10 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Kind"
          value={shelf}
          options={SHELVES}
          onChange={(v) => set({ shelf: v === "all" ? null : v, by: null })}
        />
        <Segmented label="Sort" value={sort} options={SORTS} onChange={(v) => set({ sort: v === "newest" ? null : v })} className="sm:ml-auto" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-border bg-surface p-2">
        <span className="px-2 text-[12px] font-medium text-fg-subtle">Filter</span>

        <div className="flex gap-0.5 rounded-full bg-surface-2 p-0.5" role="group" aria-label="Theme">
          {[
            ["light", "Light", Sun, facets?.schemes.light],
            ["dark", "Dark", Moon, facets?.schemes.dark],
          ].map(([value, label, Icon, count]) => {
            const on = get("scheme") === value;
            const I = Icon as typeof Sun;
            return (
              <button
                key={value as string}
                type="button"
                aria-pressed={on}
                onClick={() => set({ scheme: on ? null : (value as string) })}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors", on ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg")}
              >
                <I className="size-3.5" /> {label as string}
                {typeof count === "number" && <span className="tabular text-[11.5px] text-fg-subtle">{count}</span>}
              </button>
            );
          })}
        </div>

        {colours.length > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1" role="group" aria-label="Accent colour">
            {colours.map((c) => {
              const on = get("colour") === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  title={`${FAMILY[c].label} · ${facets?.colours[c]} ${facets?.colours[c] === 1 ? "kit" : "kits"}`}
                  aria-label={`${FAMILY[c].label} accent`}
                  onClick={() => set({ colour: on ? null : c })}
                  className={cn(
                    "relative size-6 rounded-full transition-transform duration-150 hover:scale-110",
                    on && "ring-2 ring-fg ring-offset-2 ring-offset-surface-2",
                  )}
                  style={{ background: FAMILY[c].hex }}
                />
              );
            })}
          </div>
        )}

        {facets && facets.fonts.length > 0 && (
          <label className="relative">
            <span className="sr-only">Typeface</span>
            <select value={get("font")} onChange={(e) => set({ font: e.target.value || null })} className={cn(selectClass, get("font") ? "border-accent text-fg" : "border-border text-fg-muted")}>
              <option value="">Any typeface</option>
              {facets.fonts.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.count})
                </option>
              ))}
            </select>
            <Chevron />
          </label>
        )}

        {facets && facets.icons.length > 0 && (
          <label className="relative">
            <span className="sr-only">Icon set</span>
            <select value={get("icons")} onChange={(e) => set({ icons: e.target.value || null })} className={cn(selectClass, get("icons") ? "border-accent text-fg" : "border-border text-fg-muted")}>
              <option value="">Any icons</option>
              {facets.icons.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.count})
                </option>
              ))}
            </select>
            <Chevron />
          </label>
        )}

        <button
          type="button"
          aria-pressed={Boolean(get("approved"))}
          onClick={() => set({ approved: get("approved") ? null : "1" })}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
            get("approved") ? "border-accent bg-accent-soft text-accent-soft-fg" : "border-border text-fg-muted hover:border-border-strong hover:text-fg",
          )}
        >
          <BadgeCheck className="size-3.5" /> Owner approved
        </button>

        <span className="ml-auto flex items-center gap-2 pr-1">
          {pending && <LoaderCircle className="size-4 animate-[spin_0.9s_linear_infinite] text-fg-subtle" aria-label="Updating" />}
          {active.length > 0 && (
            <button type="button" onClick={() => set(Object.fromEntries(active.map((k) => [k, null])))} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">
              <X className="size-3.5" /> Clear {active.length > 1 ? `all ${active.length}` : "filter"}
            </button>
          )}
        </span>
      </div>

      {curatorName && (
        <button
          type="button"
          onClick={() => set({ by: null, shelf: "tastes" })}
          className="group inline-flex h-9 items-center gap-2 rounded-full border border-accent/40 bg-accent-soft pl-4 pr-3 text-sm font-medium text-accent-soft-fg"
        >
          Picked by {curatorName}
          <span className="flex size-5 items-center justify-center rounded-full transition-colors group-hover:bg-accent group-hover:text-on-accent">
            <X className="size-3" strokeWidth={2.5} />
          </span>
        </button>
      )}
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange, className }: { label: string; value: string; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-border bg-surface p-1", className)}>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn("inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-150", value === id ? "bg-surface-3 text-fg" : "text-fg-muted hover:text-fg")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-fg-subtle">
      <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
