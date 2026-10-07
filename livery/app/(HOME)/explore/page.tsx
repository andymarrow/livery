import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search as MagnifyingGlass, Inbox as Tray, X } from "@/components/icons";
import { EmptyState } from "@/components/EmptyState";
import { KitCard } from "@/components/KitCard";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { cn } from "@/lib/utils";
import { listKits, type KitShelf } from "@/services/kitRead";
import { SearchBox } from "./_components/SearchBox";

export const metadata: Metadata = {
  title: "Explore the library",
  description: "Every design kit built on Livery, ready to install into your coding agent.",
};
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);
  const by = typeof params.by === "string" && /^[a-z0-9-]{1,40}$/.test(params.by) ? params.by : undefined;
  const shelf: KitShelf = by ? "tastes" : params.shelf === "sites" || params.shelf === "tastes" ? params.shelf : "all";

  let result: Awaited<ReturnType<typeof listKits>> = { cards: [], total: 0 };
  let unavailable = !supabaseConfigured();
  if (!unavailable) {
    try {
      result = await listKits({ query, shelf, curator: by, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    } catch (error) {
      unavailable = true;
      logger.warn("explore.unavailable", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const href = (p: number, next: { shelf?: KitShelf; by?: string | null } = {}) => {
    const nextShelf = next.shelf ?? shelf;
    const nextBy = next.by === undefined ? by : next.by;
    const search = new URLSearchParams({
      ...(query ? { q: query } : {}),
      ...(nextShelf !== "all" && !nextBy ? { shelf: nextShelf } : {}),
      ...(nextBy ? { by: nextBy } : {}),
      ...(p > 1 ? { page: String(p) } : {}),
    });
    return `/explore${search.size ? `?${search}` : ""}`;
  };
  const curatorName = by ? (result.cards.find((c) => c.curatorSlug === by)?.curator ?? by) : null;
  const SHELVES: { id: KitShelf; label: string }[] = [
    { id: "all", label: "All kits" },
    { id: "sites", label: "Sites" },
    { id: "tastes", label: "Tastes" },
  ];

  return (
    <div className="mx-auto w-full max-w-[80rem] px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="label-micro">The library</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Explore Kits</h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-fg-muted">
            Every link anyone pastes becomes a kit here. Open one to see its palette, rules and files, then install it in one step.
          </p>
        </div>
        <Suspense>
          <SearchBox />
        </Suspense>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-2">
        <nav aria-label="Shelves" className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-1">
          {SHELVES.map((item) => {
            const active = shelf === item.id && !by;
            return (
              <Link
                key={item.id}
                href={href(1, { shelf: item.id, by: null })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
                  active ? "bg-surface-3 text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {by && (
          <Link
            href={href(1, { shelf: "tastes", by: null })}
            className="group inline-flex h-10 items-center gap-2 rounded-full border border-accent/40 bg-accent-soft pl-4 pr-3 text-sm font-medium text-accent-soft-fg"
          >
            Picked by {curatorName}
            <span aria-label="Clear" className="flex size-5 items-center justify-center rounded-full transition-colors group-hover:bg-accent group-hover:text-on-accent">
              <X className="size-3" strokeWidth={2.5} />
            </span>
          </Link>
        )}
      </div>

      <div className="mt-6">
        {unavailable ? (
          <EmptyState icon={<Tray />} title="The Library Is Resting" description="Kits can't be listed right now. Try again in a moment." />
        ) : result.cards.length === 0 ? (
          query ? (
            <EmptyState
              icon={<MagnifyingGlass />}
              title={`No kits for “${query}” yet`}
              description="Paste the site's address on the home page and it will be built and added to the library."
              action={
                <Button asChild variant="secondary">
                  <Link href={`/build?url=${encodeURIComponent(query)}`}>Build {query}</Link>
                </Button>
              }
            />
          ) : shelf === "tastes" ? (
            <EmptyState
              icon={<Tray />}
              title={by ? `Nothing Picked by ${curatorName} Yet` : "No Tastes Yet"}
              description="A taste is one person's eye, measured across the sites they pick. Paste two to five links and name it."
              action={
                <Button asChild>
                  <Link href="/combine?kind=taste">Make a Taste Kit</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Tray />}
              title="The Library Is Empty"
              description="Be the first: paste a site you love and its kit will appear here."
              action={
                <Button asChild>
                  <Link href="/#get-a-kit">Build the First Kit</Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <p className="mb-4 text-[13px] text-fg-subtle tabular">
              {result.total.toLocaleString("en-US")} {result.total === 1 ? "kit" : "kits"}
              {query && <> matching “{query}”</>}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.cards.map((kit) => (
                <KitCard key={kit.slug} kit={kit} />
              ))}
            </div>
            {pages > 1 && (
              <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-2">
                <Button asChild variant="secondary" size="sm" aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-45" : ""}>
                  <Link href={href(page - 1)}>Previous</Link>
                </Button>
                <span className="px-3 text-[13px] text-fg-muted tabular">
                  {page} / {pages}
                </span>
                <Button asChild variant="secondary" size="sm" aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none opacity-45" : ""}>
                  <Link href={href(page + 1)}>Next</Link>
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
