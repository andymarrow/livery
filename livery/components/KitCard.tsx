import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";
import { kitPath } from "@/lib/kit/urls";
import type { KitCard as KitCardData } from "@/services/kitRead";

// A kit at a glance: its palette as a solid strip, then name, type and icons.
export function KitCard({ kit }: { kit: KitCardData }) {
  const swatches = kit.swatches.length ? kit.swatches : ["var(--surface-2)"];
  return (
    <Link
      href={kitPath(kit.slug, kit.version)}
      className="group flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface transition-[border-color,transform] duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-border-strong shadow-card"
    >
      <div className="flex h-24 border-b border-border" aria-hidden>
        {swatches.map((colour, index) => (
          <span
            key={`${colour}-${index}`}
            className="h-full transition-[flex-grow] duration-300 ease-out-soft"
            style={{ background: colour, flexGrow: index === 0 ? 3 : colour === kit.accent ? 1.4 : 1 }}
          />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">{kit.title}</p>
            <p className="truncate text-[12.5px] text-fg-subtle">{kit.detail}</p>
          </div>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-fg-subtle transition-colors duration-150 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent">
            <ArrowUpRight strokeWidth={2.25} className="size-3.5" />
          </span>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11.5px] text-fg-muted">
          {kit.kind === "taste" && <span className="rounded-full border border-accent/40 px-2 py-0.5 font-medium text-accent-ink">Taste</span>}
          {kit.kind === "site" && <span className="rounded-full border border-border-strong px-2 py-0.5 font-medium text-fg">Multi-page</span>}
          {kit.ownerApproved && <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-soft-fg">Owner approved</span>}
          {kit.scheme && <span className="rounded-full bg-surface-2 px-2 py-0.5 capitalize">{kit.scheme}</span>}
          {kit.font && <span className="max-w-[10rem] truncate rounded-full bg-surface-2 px-2 py-0.5">{kit.font}</span>}
          {kit.iconSet && <span className="max-w-[10rem] truncate rounded-full bg-surface-2 px-2 py-0.5">{kit.iconSet}</span>}
          <span className="ml-auto font-mono text-fg-subtle">v{kit.version}</span>
        </div>
      </div>
    </Link>
  );
}
