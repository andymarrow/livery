"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/_context/AuthContext";
import { Bookmark, BookmarkCheck } from "@/components/icons";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

// Saves a kit to the signed-in person's library. Row-level security means
// the browser can only ever read and change its own saved list.
export function SaveButton({ kitId }: { kitId: string }) {
  const auth = useAuth();
  const pathname = usePathname();
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth.user) return;
    let live = true;
    createClient()
      .from("saved_kits")
      .select("kit_id")
      .eq("kit_id", kitId)
      .maybeSingle()
      .then(({ data }) => live && setSaved(Boolean(data)));
    return () => {
      live = false;
    };
  }, [auth.user, kitId]);

  const base = "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors";
  if (!auth.ready) return null;
  if (!auth.user) {
    return (
      <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`} className={cn(base, "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg")} title="Sign in to save kits to your library">
        <Bookmark className="size-4" /> Save
      </Link>
    );
  }
  const toggle = async () => {
    if (busy || saved === null || !auth.user) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    const supabase = createClient();
    const { error } = next
      ? await supabase.from("saved_kits").insert({ user_id: auth.user.id, kit_id: kitId })
      : await supabase.from("saved_kits").delete().eq("kit_id", kitId);
    if (error) setSaved(!next);
    setBusy(false);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={Boolean(saved)}
      disabled={saved === null}
      className={cn(base, saved ? "border-accent bg-accent-soft text-accent-soft-fg" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg")}
    >
      {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
