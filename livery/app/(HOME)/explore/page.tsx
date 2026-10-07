import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search as MagnifyingGlass, Inbox as Tray } from "@/components/icons";
import { EmptyState } from "@/components/EmptyState";
import { KitCard } from "@/components/KitCard";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { COLOUR_FAMILIES, libraryFacets, listKits, type ColourFamily, type KitFilters, type KitShelf, type KitSort, type LibraryFacets } from "@/services/kitRead";
import { LibraryFilters } from "./_components/LibraryFilters";
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
  const sort: KitSort = params.sort === "liked" || params.sort === "downloaded" || params.sort === "viewed" ? params.sort : "newest";
  const text = (key: string) => (typeof params[key] === "string" ? (params[key] as string).slice(0, 80) : undefined);
  const filters: KitFilters = {
    scheme: params.scheme === "light" || params.scheme === "dark" ? params.scheme : undefined,
    colour: COLOUR_FAMILIES.includes(params.colour as ColourFamily) ? (params.colour as ColourFamily) : undefined,
    font: text("font"),
    icons: text("icons"),
    approved: params.approved === "1" || undefined,
  };
  const filtering = Boolean(filters.scheme || filters.colour || filters.font || filters.icons || filters.approved);

  let result: Awaited<ReturnType<typeof listKits>> = { cards: [], total: 0 };
  let facets: LibraryFacets | null = null;
  let unavailable = !supabaseConfigured();
  if (!unavailable) {
    try {
      [result, facets] = await Promise.all([
        listKits({ query, shelf, curator: by, sort, filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
        libraryFacets().catch(() => null),
      ]);
    } catch (error) {
      unavailable = true;
      logger.warn("explore.unavailable", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  // Paging keeps every filter, sort and search in place.
  const href = (p: number, next: { shelf?: KitShelf; by?: string | null } = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (typeof value === "string" && key !== "page") search.set(key, value);
    if (next.shelf) {
      if (next.shelf === "all") search.delete("shelf");
      else search.set("shelf", next.shelf);
    }
    if (next.by === null) search.delete("by");
    if (p > 1) search.set("page", String(p));
    return `/explore${search.size ? `?${search}` : ""}`;
  };
  const curatorName = by ? (result.cards.find((c) => c.curatorSlug === by)?.curator ?? by) : null;

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

      <Suspense>
        <LibraryFilters facets={facets} curatorName={curatorName} />
      </Suspense>

      <div className="mt-6">
        {unavailable ? (
          <EmptyState icon={<Tray />} title="The Library Is Resting" description="Kits can't be listed right now. Try again in a moment." />
        ) : result.cards.length === 0 ? (
          filtering ? (
            <EmptyState
              icon={<MagnifyingGlass />}
              title="No Kits Match These Filters"
              description="Try fewer filters, or a different colour or typeface."
              action={
                <Button asChild variant="secondary">
                  <Link href={`/explore${query ? `?q=${encodeURIComponent(query)}` : ""}`}>Clear filters</Link>
                </Button>
              }
            />
          ) : query ? (
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
                  <Link href="/create?kind=taste">Make a Taste Kit</Link>
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
              {filtering && <> with these filters</>}
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
