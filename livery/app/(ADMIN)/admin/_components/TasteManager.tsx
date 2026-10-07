"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminCombineKits } from "@/app/actions/adminCombineKits";
import { adminUpdateKit } from "@/app/actions/adminUpdateKit";
import { ArrowRight, Pencil, Plus, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { AdminKit } from "@/services/admin";
import { Field, inputClass, KindBadge } from "./Controls";

const MAX = 5;
const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");
const label = (kind: string, url: string) => (kind === "site" ? new URL(url).pathname || "/" : hostOf(url));

export function TasteManager({ combined, pages, initialEdit }: { combined: AdminKit[]; pages: AdminKit[]; initialEdit: string | null }) {
  const [editingId, setEditingId] = useState<string | null>(initialEdit);
  const editing = combined.find((k) => k.id === editingId) ?? null;
  return (
    <>
      {combined.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {combined.map((k) => (
            <article key={k.id} className="flex gap-4 rounded-[14px] border border-border bg-surface p-4">
              <span className="h-20 w-32 shrink-0 overflow-hidden rounded-[8px] border border-border bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed or public storage URL */}
                {k.preview && <img src={k.preview} alt="" className="h-full w-full object-cover object-top" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <KindBadge kind={k.kind} />
                  <span className="font-mono text-[11px] text-fg-subtle">v{k.latest?.version}</span>
                  {k.latest?.status !== "ready" && <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium text-danger">Withdrawn</span>}
                </div>
                <h2 className="mt-1 truncate text-[15px] font-semibold tracking-tight">{k.name}</h2>
                <ol className="mt-2 flex flex-wrap gap-1">
                  {k.sources.map((s, i) => (
                    <li key={s.url} className="rounded-full border border-border px-2 py-0.5 text-[11.5px] text-fg-muted">
                      <span className="mr-1 font-mono text-[10px] text-fg-subtle">{i + 1}</span>
                      {label(k.kind, s.url)}
                    </li>
                  ))}
                </ol>
              </div>
              <button type="button" onClick={() => setEditingId(k.id)} className="flex h-8 shrink-0 items-center gap-1.5 self-start rounded-[8px] border border-border px-2.5 text-[12px] font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg">
                <Pencil className="size-3.5" /> Edit
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-[14px] border border-dashed border-border-strong px-4 py-14 text-center text-sm text-fg-muted">No tastes yet. Tick page kits on the Kits page and choose Make a taste.</p>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <SheetContent className="w-[min(32rem,100vw)] overflow-y-auto">{editing && <Editor key={editing.id} kit={editing} pages={pages} onClose={() => setEditingId(null)} />}</SheetContent>
      </Sheet>
    </>
  );
}

function Editor({ kit, pages, onClose }: { kit: AdminKit; pages: AdminKit[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [urls, setUrls] = useState(kit.sources.map((s) => s.url));
  const [curator, setCurator] = useState(kit.curator ?? "");
  const [adding, setAdding] = useState("");
  const [pending, start] = useTransition();
  const changed = urls.join() !== kit.sources.map((s) => s.url).join();
  const nameChanged = curator !== (kit.curator ?? "");
  const host = kit.kind === "site" && kit.sources[0] ? hostOf(kit.sources[0].url) : null;
  const candidates = pages.filter((p) => p.sourceUrl && !urls.includes(p.sourceUrl) && (!host || hostOf(p.sourceUrl) === host));

  const move = (from: number, to: number) =>
    setUrls((list) => {
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const publish = () =>
    start(async () => {
      if (nameChanged && kit.kind === "taste") await adminUpdateKit(kit.id, { curator: curator.trim() || null });
      if (changed) {
        const result = await adminCombineKits({ kind: kit.kind as "site" | "taste", urls, curator: curator.trim() || null, kitId: kit.id });
        if (!result.ok) {
          toast({ title: "Couldn't publish", description: result.error, tone: "danger" });
          return;
        }
        toast({ title: `v${(kit.latest?.version ?? 0) + 1} published`, description: result.path, tone: "success" });
      } else toast({ title: "Saved", tone: "success" });
      router.refresh();
      onClose();
    });

  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-2 pr-10">
        <KindBadge kind={kit.kind} />
        <span className="font-mono text-[11.5px] text-fg-subtle">{kit.slug}</span>
      </div>
      <SheetTitle className="mt-2 text-xl font-semibold tracking-tight">{kit.name}</SheetTitle>

      {kit.kind === "taste" && (
        <div className="mt-6">
          <Field label="Whose taste">
            <input value={curator} onChange={(e) => setCurator(e.target.value)} maxLength={40} placeholder="Unnamed" className={inputClass} />
          </Field>
        </div>
      )}

      <div className="mt-6">
        <p className="mb-2 text-[12.5px] font-medium text-fg-muted">{kit.kind === "site" ? "Pages" : "Sites"}, in order. The first one is the base.</p>
        <ol className="divide-y divide-border rounded-[12px] border border-border">
          {urls.map((url, i) => (
            <li key={url} className="flex items-center gap-3 px-3 py-2.5">
              <span className="font-mono text-[11px] text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{label(kit.kind, url)}</span>
              {i === 0 ? (
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-fg-muted">Base</span>
              ) : (
                <button type="button" onClick={() => move(i, 0)} className="text-[12px] text-fg-muted hover:text-fg">Make base</button>
              )}
              <button type="button" aria-label={`Remove ${url}`} disabled={urls.length <= 2} onClick={() => setUrls((list) => list.filter((u) => u !== url))} className="flex size-7 items-center justify-center rounded-[8px] text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
        {urls.length < MAX && (
          <div className="mt-3 flex gap-2">
            <select value={adding} onChange={(e) => setAdding(e.target.value)} className={cn(inputClass, "flex-1")}>
              <option value="">Add a kit from the library…</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.sourceUrl!}>
                  {p.name} {p.sourceUrl && new URL(p.sourceUrl).pathname !== "/" ? new URL(p.sourceUrl).pathname : ""}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              disabled={!adding}
              onClick={() => {
                setUrls((list) => [...list, adding]);
                setAdding("");
              }}
            >
              <Plus /> Add
            </Button>
          </div>
        )}
        <p className="mt-2 text-[12px] text-fg-subtle">Only kits already in the library can be added. Build a new one from Kits → New kit.</p>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-[12.5px] text-fg-muted">{changed ? `Publishes v${(kit.latest?.version ?? 0) + 1}.` : nameChanged ? "Renames it; no new version." : "No changes yet."}</p>
        <Button onClick={publish} disabled={pending || (!changed && !nameChanged)}>
          {pending ? "Publishing…" : changed ? "Publish new version" : "Save"} <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
