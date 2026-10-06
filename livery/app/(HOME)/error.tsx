"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCw, TriangleAlert } from "@/components/icons";
import { Button } from "@/components/ui/button";

// Keeps the site header and footer; only the page area shows the error.
export default function HomeError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border bg-surface text-fg-muted">
          <TriangleAlert className="size-5" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.035em]">Something broke on our side</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">It isn&apos;t you. Try again, and if it keeps happening, come back in a few minutes.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button onClick={() => retry()}>
            <RotateCw /> Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">
              <ArrowLeft /> Home
            </Link>
          </Button>
        </div>
        {error.digest && <p className="mt-10 font-mono text-[11px] text-fg-subtle">ref {error.digest}</p>}
      </div>
    </div>
  );
}
