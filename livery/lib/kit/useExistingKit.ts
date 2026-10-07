"use client";

import { useEffect, useState } from "react";

// Whether a link is already in the library, asked as the visitor types
// (debounced, remembered per link). Lets the page say "already submitted"
// before anything is built.

export type ExistingKit = { state: "idle" | "checking" | "none" } | { state: "found"; path: string };

const known = new Map<string, string | null>();

export function useExistingKit(path: string | null, delay = 350): ExistingKit {
  const [result, setResult] = useState<{ path: string; kit: string | null } | null>(null);

  useEffect(() => {
    if (!path || known.has(path)) return;
    let live = true;
    const id = setTimeout(async () => {
      const res = await fetch(`/api/kits/status?url=${encodeURIComponent(path)}`, { cache: "no-store" }).catch(() => null);
      const data = res?.ok ? ((await res.json()) as { ready: boolean; path?: string }) : null;
      const kit = data?.ready && data.path ? data.path : null;
      if (res?.ok) known.set(path, kit);
      if (live) setResult({ path, kit });
    }, delay);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [path, delay]);

  if (!path) return { state: "idle" };
  const cached = known.has(path) ? known.get(path)! : result?.path === path ? result.kit : undefined;
  if (cached === undefined) return { state: "checking" };
  return cached ? { state: "found", path: cached } : { state: "none" };
}
