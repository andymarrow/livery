import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search as MagnifyingGlass, Inbox as Tray } from "@/components/icons";
import { EmptyState } from "@/components/EmptyState";
import { KitCard } from "@/components/KitCard";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { listKits } from "@/services/kitRead";
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

  let result: Awaited<ReturnType<typeof listKits>> = { cards: [], total: 0 };
  let unavailable = !supabaseConfigured();
  if (!unavailable) {
    try {
      result = await listKits({ query, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    } catch (error) {
      unavailable = true;
      logger.warn("explore.unavailable", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const href = (p: number) => `/explore?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
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

      <div className="mt-10">
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
