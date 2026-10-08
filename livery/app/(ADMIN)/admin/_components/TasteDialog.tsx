"use client";

import { useState, useTransition } from "react";
import { X } from "@/components/icons";
import { COMBINE_LIMITS } from "@/lib/combine/identity";
import { useRouter } from "next/navigation";
import { adminCombineKits } from "@/app/actions/adminCombineKits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { AdminKit } from "@/services/admin";
import { Field, inputClass } from "./Controls";

// Admins grow tastes from kits already measured, so they may go past a visitor's five.
const MAX = COMBINE_LIMITS.adminMax;
const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

// Turns chosen page kits into a taste: a new one under a name, or the next
// version of an existing taste with these sites added.
export function TasteDialog({ picked, tastes, onClose }: { picked: AdminKit[] | null; tastes: AdminKit[]; onClose: () => void }) {
  return (
    <Dialog open={picked !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">{picked && <Body key={picked.map((p) => p.id).join()} picked={picked} tastes={tastes} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function Body({ picked, tastes, onClose }: { picked: AdminKit[]; tastes: AdminKit[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const sameSite = new Set(picked.map((k) => hostOf(k.sourceUrl!))).size === 1 && picked.length > 1;
  const [mode, setMode] = useState<"new" | "existing" | "pages">(tastes.length && picked.length === 1 ? "existing" : "new");
  const [curator, setCurator] = useState("");
  const [target, setTarget] = useState(tastes[0]?.id ?? "");
  const [pending, start] = useTransition();
  // Sites taken out of the combination (an existing taste's own sites included).
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const existing = tastes.find((t) => t.id === target);
  const urls = (
    mode === "existing" && existing
      ? [...new Set([...existing.sources.map((s) => s.url), ...picked.map((k) => k.sourceUrl!)])]
      : picked.map((k) => k.sourceUrl!)
  ).filter((url) => !removed.has(url));
  const tooMany = urls.length > MAX;
  const tooFew = urls.length < 2;

  const submit = () =>
    start(async () => {
      const result = await adminCombineKits(
        mode === "existing" && existing
          ? { kind: "taste", urls, curator: existing.curator, kitId: existing.id }
          : { kind: mode === "pages" ? "site" : "taste", urls, curator: mode === "new" ? curator.trim() || null : null },
      );
      if (result.ok) {
        toast({ title: mode === "existing" ? "Taste updated" : "Kit created", description: result.path, tone: "success" });
        router.refresh();
        onClose();
      } else toast({ title: "Couldn't combine", description: result.error, tone: "danger" });
    });

  const options = [
    { id: "new" as const, label: "New taste", show: true },
    { id: "existing" as const, label: "Add to a taste", show: tastes.length > 0 },
    { id: "pages" as const, label: "Multi-page kit", show: sameSite },
  ].filter((o) => o.show);

  return (
    <div>
      <DialogTitle>Combine {picked.length === 1 ? picked[0].name : `${picked.length} kits`}</DialogTitle>
      <DialogDescription className="mt-1 text-[13px] text-fg-muted">Uses the kits already measured; nothing is rendered again. As admin you can make a taste of 2 to 12 sites (visitors are limited to 5). Remove any site with its ×.</DialogDescription>

      <div className="mt-5 flex gap-1 rounded-[10px] bg-surface-2 p-1">
        {options.map((o) => (
          <button key={o.id} type="button" onClick={() => setMode(o.id)} className={cn("h-8 flex-1 rounded-[8px] text-[13px] font-medium transition-colors", mode === o.id ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg")}>
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {mode === "new" && (
          <Field label="Whose taste" hint="Optional. Named tastes are listed under that person.">
            <input value={curator} onChange={(e) => setCurator(e.target.value)} maxLength={40} placeholder="Andy" className={inputClass} autoFocus />
          </Field>
        )}
        {mode === "existing" && (
          <Field label="Taste" hint={existing ? `Publishes v${(existing.latest?.version ?? 0) + 1} of ${existing.name}; older versions keep working.` : undefined}>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass}>
              {tastes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.sources.length} sites
                </option>
              ))}
            </select>
          </Field>
        )}
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-fg-muted">Sites, in order (the first is the base)</p>
          <ol className="flex flex-wrap gap-1.5">
            {urls.map((url, i) => (
              <li key={url} className={cn("inline-flex items-center rounded-full border py-1 pl-2.5 pr-1 text-[12.5px]", i >= MAX ? "border-danger text-danger" : "border-border text-fg-muted")}>
                <span className="mr-1.5 font-mono text-[10.5px] text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                {mode === "pages" ? new URL(url).pathname : hostOf(url)}
                <button
                  type="button"
                  onClick={() => setRemoved((r) => new Set(r).add(url))}
                  aria-label={`Remove ${hostOf(url)} from this taste`}
                  className="ml-1 flex size-5 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ol>
          {tooMany && <p className="mt-2 text-[12.5px] text-danger">That&apos;s {urls.length} sites; a taste holds at most {MAX}.</p>}
          {tooFew && <p className="mt-2 text-[12.5px] text-fg-subtle">Pick at least two kits, or add this one to an existing taste.</p>}
          {removed.size > 0 && (
            <button type="button" onClick={() => setRemoved(new Set())} className="mt-2 text-[12.5px] text-fg-muted underline underline-offset-4 hover:text-fg">
              Put back {removed.size} removed {removed.size === 1 ? "site" : "sites"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={pending || tooMany || tooFew}>
          {pending ? "Combining…" : mode === "existing" ? "Publish new version" : "Create kit"}
        </Button>
      </div>
    </div>
  );
}
