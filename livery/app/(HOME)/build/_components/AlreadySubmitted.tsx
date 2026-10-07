import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Palette } from "@/lib/extract/process/tokens";

// A link that is already in the library isn't built twice: the visitor is
// told so, and gets the kit that exists.
export function AlreadySubmitted({ path, title, page, version, publishedAt, palette }: { path: string; title: string; page: string; version: number; publishedAt: string; palette: Palette | null }) {
  const swatches = palette ? [palette.background, palette.surface, palette.text, palette.accent, palette.border].filter((c): c is string => Boolean(c)) : [];
  return (
    <div className="mx-auto w-full max-w-lg text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-[18px] border border-border bg-surface text-accent-ink shadow-card">
        <BadgeCheck className="size-6" />
      </span>
      <p className="label-micro mt-6">Already submitted</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">{title} Is Already in the Library</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted text-pretty">
        Someone has already turned {page === "/" ? "this site" : `this page (${page})`} into a kit, so there&apos;s nothing to build. Open it and install it in one step.
      </p>

      <Link href={path} className="group mx-auto mt-8 block max-w-sm overflow-hidden rounded-[18px] border border-border bg-surface text-left shadow-card transition-[border-color,transform] duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-border-strong">
        <span className="flex h-16 border-b border-border" aria-hidden>
          {(swatches.length ? swatches : ["var(--surface-2)"]).map((colour, i) => (
            <span key={`${colour}-${i}`} className="h-full" style={{ background: colour, flexGrow: i === 0 ? 3 : 1 }} />
          ))}
        </span>
        <span className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
            <span className="block text-[12.5px] text-fg-subtle">v{version} · published {publishedAt.slice(0, 10)}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href={path}>
            Open the Kit <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/#get-a-kit">
            <ArrowLeft /> Try Another Site
          </Link>
        </Button>
      </div>
    </div>
  );
}
