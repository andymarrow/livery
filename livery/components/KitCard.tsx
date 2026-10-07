import Link from "next/link";
import { AddToTaste } from "@/components/AddToTaste";
import { ArrowUpRight } from "@/components/icons";
import { kitPath } from "@/lib/kit/urls";
import type { KitCard as KitCardData } from "@/services/kitRead";

// A kit at a glance: its layout (the content-removed frame, panning on hover)
// over its palette, then name, type and icons.
// The whole card opens the kit; page kits also carry a "+ Taste" button.
export function KitCard({ kit }: { kit: KitCardData }) {
  const swatches = kit.swatches.length ? kit.swatches : ["var(--surface-2)"];
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface shadow-card transition-[border-color,transform] duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-border-strong has-[a:focus-visible]:border-accent">
      {kit.preview ? (
        <div className="relative h-44 overflow-hidden border-b border-border bg-surface-2" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
          <img
            src={kit.preview}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top transition-[object-position] duration-[2400ms] ease-out-soft group-hover:object-[50%_30%] motion-reduce:transition-none"
          />
          <div className="absolute inset-x-0 bottom-0 flex h-2">
            {swatches.map((colour, index) => (
              <span key={`${colour}-${index}`} className="h-full" style={{ background: colour, flexGrow: index === 0 ? 3 : colour === kit.accent ? 1.4 : 1 }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-24 border-b border-border" aria-hidden>
          {swatches.map((colour, index) => (
            <span
              key={`${colour}-${index}`}
              className="h-full transition-[flex-grow] duration-300 ease-out-soft"
              style={{ background: colour, flexGrow: index === 0 ? 3 : colour === kit.accent ? 1.4 : 1 }}
            />
          ))}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight">
              <Link href={kitPath(kit.slug, kit.version)} className="outline-none after:absolute after:inset-0 after:content-['']">
                {kit.title}
              </Link>
            </h3>
            <p className="truncate text-[12.5px] text-fg-subtle">{kit.detail}</p>
          </div>
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-fg-subtle transition-colors duration-150 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent">
            <ArrowUpRight strokeWidth={2.25} className="size-3.5" />
          </span>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11.5px] text-fg-muted">
          {kit.kind === "taste" && <span className="rounded-full border border-accent/40 px-2 py-0.5 font-medium text-accent-ink">Taste</span>}
          {kit.kind === "site" && <span className="rounded-full border border-border-strong px-2 py-0.5 font-medium text-fg">Multi-page</span>}
          {kit.ownerApproved && <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-soft-fg">Owner approved</span>}
          {kit.scheme && <span className="rounded-full bg-surface-2 px-2 py-0.5 capitalize">{kit.scheme}</span>}
          {kit.font && <span className="max-w-[10rem] truncate rounded-full bg-surface-2 px-2 py-0.5">{kit.font}</span>}
          <span className="ml-auto flex items-center gap-2">
            {kit.kind === "page" && kit.sourceUrl && <AddToTaste url={kit.sourceUrl} />}
            <span className="font-mono text-fg-subtle">v{kit.version}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
