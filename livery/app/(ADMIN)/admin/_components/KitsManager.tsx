"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminBuildKit } from "@/app/actions/adminBuildKit";
import { adminUpdateKit } from "@/app/actions/adminUpdateKit";
import { EyeOff, Layers, Plus, RotateCw, Search, Star, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { AdminKit } from "@/services/admin";
import { when } from "./AdminPage";
import { Field, inputClass, KindBadge } from "./Controls";
import { KitEditor } from "./KitEditor";
import { refreshKit } from "./refreshKit";
import { TasteDialog } from "./TasteDialog";

type KindFilter = "all" | "page" | "site" | "taste";
type StateFilter = "all" | "live" | "featured" | "hidden" | "withdrawn";

export function KitsManager({ kits }: { kits: AdminKit[] }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [combining, setCombining] = useState<AdminKit[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startStar] = useTransition();
  // Kits being analysed again, with what each is doing right now.
  const [refreshing, setRefreshing] = useState<Record<string, string>>({});

  const refresh = async (k: AdminKit) => {
    const step = (text: string) => setRefreshing((r) => ({ ...r, [k.id]: text }));
    step("Starting");
    const result = await refreshKit(k, step);
    setRefreshing((r) => {
      const next = { ...r };
      delete next[k.id];
      return next;
    });
    if (result.ok) toast({ title: `${k.name} refreshed`, description: `New version: ${result.path}`, tone: "success" });
    else toast({ title: `Couldn't refresh ${k.name}`, description: result.error, tone: "danger" });
    router.refresh();
    return result.ok;
  };

  // One at a time: each refresh renders a live site.
  const refreshMany = async (list: AdminKit[]) => {
    setSelected(new Set());
    for (const k of list) await refresh(k);
  };

  const tastes = kits.filter((k) => k.kind === "taste" && k.latest?.status === "ready");
  const editing = kits.find((k) => k.id === editingId) ?? null;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kits.filter((k) => {
      if (kind !== "all" && k.kind !== kind) return false;
      if (state === "live" && k.latest?.status !== "ready") return false;
      if (state === "withdrawn" && k.latest?.status !== "withdrawn") return false;
      if (state === "featured" && !k.featured) return false;
      if (state === "hidden" && !k.hidden) return false;
      return !q || [k.name, k.slug, k.curator ?? "", k.sourceUrl ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [kits, query, kind, state]);

  const selectable = (k: AdminKit) => k.kind === "page" && k.latest?.status === "ready";
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pickedKits = kits.filter((k) => selected.has(k.id));
  const allShownSelected = shown.filter(selectable).length > 0 && shown.filter(selectable).every((k) => selected.has(k.id));

  const star = (k: AdminKit) =>
    startStar(async () => {
      await adminUpdateKit(k.id, { featured: !k.featured });
      router.refresh();
    });

  return (
    <>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full xl:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, slug, URL or person" className={cn(inputClass, "pl-9")} />
        </div>
        <Segmented value={kind} onChange={setKind} options={[["all", "All"], ["page", "Pages"], ["site", "Multi-page"], ["taste", "Tastes"]]} />
        <Segmented value={state} onChange={setState} options={[["all", "Any state"], ["live", "Live"], ["featured", "Featured"], ["hidden", "Hidden"], ["withdrawn", "Withdrawn"]]} />
        <Button className="xl:ml-auto" onClick={() => setAdding(true)}>
          <Plus /> New kit
        </Button>
      </div>

      <div className={cn("grid transition-[grid-template-rows,margin] duration-200 ease-out-soft", selected.size ? "mt-3 grid-rows-[1fr]" : "mt-0 grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="flex items-center gap-3 rounded-[12px] border border-accent/40 bg-accent-soft px-4 py-2.5 text-[13px] text-accent-soft-fg">
            <span className="font-medium">{selected.size} selected</span>
            <Button size="sm" onClick={() => setCombining(pickedKits)}>
              <Layers /> Make a taste
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void refreshMany(pickedKits)}>
              <RotateCw /> Refresh {selected.size === 1 ? "it" : `all ${selected.size}`}
            </Button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto inline-flex items-center gap-1 text-[12.5px] hover:underline">
              <X className="size-3.5" /> Clear
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-[14px] border border-border bg-surface">
        <table className="w-full min-w-[52rem] text-left text-[13px]">
          <thead className="bg-surface-2/50">
            <tr className="border-b border-border text-[11.5px] text-fg-muted">
              <th className="h-10 w-10 pl-4">
                <input
                  type="checkbox"
                  aria-label="Select all page kits shown"
                  checked={allShownSelected}
                  onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.filter(selectable).map((k) => k.id)))}
                  className="size-4 accent-[var(--accent)]"
                />
              </th>
              <th className="px-3 font-medium">Kit</th>
              <th className="px-3 font-medium">Kind</th>
              <th className="px-3 font-medium">Version</th>
              <th className="px-3 font-medium">State</th>
              <th className="px-3 font-medium">Published</th>
              <th className="w-36 px-4" />
            </tr>
          </thead>
          <tbody>
            {shown.map((k) => (
              <tr key={k.id} className={cn("border-b border-border transition-colors last:border-0 hover:bg-surface-2/40", selected.has(k.id) && "bg-accent-soft/40")}>
                <td className="pl-4">
                  {selectable(k) && <input type="checkbox" aria-label={`Select ${k.name}`} checked={selected.has(k.id)} onChange={() => toggle(k.id)} className="size-4 accent-[var(--accent)]" />}
                </td>
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => setEditingId(k.id)} className="flex items-center gap-3 text-left">
                    <span className="h-10 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed or public storage URL */}
                      {k.preview && <img src={k.preview} alt="" loading="lazy" className="h-full w-full object-cover object-top" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium hover:underline">{k.name}</span>
                      {refreshing[k.id] ? (
                        <span className="flex items-center gap-1.5 truncate text-[11.5px] font-medium text-accent-ink">
                          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent" /> {refreshing[k.id]}
                        </span>
                      ) : (
                        <span className="block truncate font-mono text-[11px] text-fg-subtle">{k.slug}</span>
                      )}
                    </span>
                  </button>
                </td>
                <td className="px-3"><KindBadge kind={k.kind} /></td>
                <td className="px-3 font-mono text-[12px]">v{k.latest?.version}{k.versions > 1 && <span className="text-fg-subtle"> / {k.versions}</span>}</td>
                <td className="px-3">
                  <span className="flex flex-wrap gap-1">
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", k.latest?.status === "ready" ? "bg-accent-soft text-accent-soft-fg" : "bg-danger-soft text-danger")}>{k.latest?.status === "ready" ? "Live" : "Withdrawn"}</span>
                    {k.featured && <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium">Featured</span>}
                    {k.hidden && <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-fg-muted"><EyeOff className="size-3" /> Hidden</span>}
                  </span>
                </td>
                <td className="px-3 font-mono text-[12px] text-fg-muted">{when(k.latest?.publishedAt)}</td>
                <td className="px-4">
                  <span className="flex items-center justify-end gap-1">
                    {k.latest?.status === "ready" && (
                      <button
                        type="button"
                        onClick={() => void refresh(k)}
                        disabled={Boolean(refreshing[k.id])}
                        aria-label={`Refresh ${k.name}`}
                        title={k.kind === "page" ? "Analyse the site again (new version)" : "Re-analyse every site, then recombine (new version)"}
                        className="flex size-8 items-center justify-center rounded-[8px] text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg disabled:text-accent-ink"
                      >
                        <RotateCw className={cn("size-4", refreshing[k.id] && "animate-[spin_1s_linear_infinite]")} />
                      </button>
                    )}
                    <button type="button" onClick={() => star(k)} aria-label={k.featured ? "Unfeature" : "Feature"} title={k.featured ? "Unfeature" : "Feature on the homepage"} className={cn("flex size-8 items-center justify-center rounded-[8px] transition-colors hover:bg-surface-2", k.featured ? "text-accent-ink" : "text-fg-subtle")}>
                      <Star className={cn("size-4", k.featured && "fill-current")} />
                    </button>
                    <button type="button" onClick={() => setEditingId(k.id)} className="h-8 rounded-[8px] border border-border px-2.5 text-[12px] font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg">
                      Edit
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="px-4 py-14 text-center text-sm text-fg-muted">No kits match.</p>}
      </div>
      <p className="mt-3 text-[12px] text-fg-subtle">
        {shown.length} of {kits.length} kits. Tick page kits to combine or refresh them. Refreshing renders the site again and publishes a new version; keep this tab open until it finishes.
      </p>

      <KitEditor
        kit={editing}
        onClose={() => setEditingId(null)}
        onAddToTaste={(k) => {
          setEditingId(null);
          setCombining([k]);
        }}
      />
      <TasteDialog
        picked={combining}
        tastes={tastes}
        onClose={() => {
          setCombining(null);
          setSelected(new Set());
        }}
      />
      <NewKitDialog
        open={adding}
        onClose={() => setAdding(false)}
        onDone={(path) => {
          toast({ title: "Kit ready", description: path, tone: "success" });
          router.refresh();
        }}
      />
    </>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex shrink-0 gap-0.5 overflow-x-auto rounded-[10px] bg-surface-2 p-1">
      {options.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)} className={cn("h-8 whitespace-nowrap rounded-[8px] px-3 text-[12.5px] font-medium transition-colors", value === id ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg")}>
          {label}
        </button>
      ))}
    </div>
  );
}

function NewKitDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (path: string) => void }) {
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent>
        <DialogTitle>New kit</DialogTitle>
        <DialogDescription className="mt-1 text-[13px] text-fg-muted">Builds a page kit from any public URL, outside the visitor limit. Takes a minute or two.</DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await adminBuildKit(url.trim());
              if (result.ok) {
                onDone(result.path);
                setUrl("");
                onClose();
              } else toast({ title: "Couldn't build", description: result.error, tone: "danger" });
            });
          }}
        >
          <Field label="Website">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="linear.app/pricing" className={inputClass} autoFocus required disabled={pending} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending || !url.trim()}>{pending ? "Building… keep this open" : "Build kit"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
