"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminBuildKit } from "@/app/actions/adminBuildKit";
import { adminUpdateKit } from "@/app/actions/adminUpdateKit";
import { DropdownMenu } from "radix-ui";
import { adminDeleteKits } from "@/app/actions/adminDeleteKits";
import { adminSetKitsHidden } from "@/app/actions/adminSetKitsHidden";
import { adminWithdrawVersion } from "@/app/actions/adminWithdrawVersion";
import { Ellipsis, Eye, EyeOff, ExternalLink, Info, Layers, LockKeyhole, Pencil, Plus, RotateCw, Search, Star, Trash2 as Trash, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { AdminKit } from "@/services/admin";
import { when } from "./AdminPage";
import { DangerDialog } from "./DangerDialog";
import { Field, inputClass, KindBadge } from "./Controls";
import { KitEditor } from "./KitEditor";
import { recombine, refreshKit } from "./refreshKit";
import { TasteDialog } from "./TasteDialog";

type KindFilter = "all" | "page" | "site" | "taste";
type StateFilter = "all" | "live" | "private" | "featured" | "hidden" | "withdrawn";

// What each state means, in the admin's words.
const STATES: [string, string][] = [
  ["Live", "Published and public: in the library, installable by anyone."],
  ["Private", "Its newest version is visible only to its owner (pages added with the browser extension, not yet published)."],
  ["Hidden", "Still works at its address, but left out of the library and search. Reversible."],
  ["Featured", "Shown on the homepage."],
  ["Withdrawn", "Its files are removed and its links answer 410 Gone; the record stays as history. Happens after a takedown, a site owner's opt-out, or a manual withdraw. Delete it to remove it completely."],
];

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
    if (result.ok && result.cached) toast({ title: `${k.name} is already up to date`, description: "Every site is at its newest version." });
    else if (result.ok) toast({ title: `${k.name} refreshed`, description: `New version: ${result.path}`, tone: "success" });
    else toast({ title: `Couldn't refresh ${k.name}`, description: result.error, tone: "danger" });
    router.refresh();
    return result.ok;
  };

  // One at a time: each refresh renders a live site. Then every taste or
  // multi-page kit that uses one of those sites is rebuilt once from the
  // newest versions, so it reflects them without rendering anything again.
  const refreshMany = async (list: AdminKit[]) => {
    setSelected(new Set());
    const done: string[] = [];
    for (const k of list) if (await refresh(k)) done.push(k.sourceUrl ?? "");
    const affected = kits.filter((c) => c.kind !== "page" && c.latest?.status === "ready" && c.sources.some((s) => done.includes(s.url)));
    for (const c of affected) {
      setRefreshing((r) => ({ ...r, [c.id]: "Combining the newest versions" }));
      const result = await recombine(c);
      setRefreshing((r) => {
        const next = { ...r };
        delete next[c.id];
        return next;
      });
      if (result.ok && !result.cached) toast({ title: `${c.name} updated`, description: `Now uses the refreshed sites: ${result.path}`, tone: "success" });
      else if (!result.ok) toast({ title: `Couldn't update ${c.name}`, description: result.error, tone: "danger" });
    }
    router.refresh();
  };

  const tastes = kits.filter((k) => k.kind === "taste" && k.latest?.status === "ready");
  const editing = kits.find((k) => k.id === editingId) ?? null;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kits.filter((k) => {
      if (kind !== "all" && k.kind !== kind) return false;
      if (state === "live" && (k.latest?.status !== "ready" || k.latest.visibility !== "public")) return false;
      if (state === "private" && k.latest?.visibility !== "private") return false;
      if (state === "withdrawn" && k.latest?.status !== "withdrawn") return false;
      if (state === "featured" && !k.featured) return false;
      if (state === "hidden" && !k.hidden) return false;
      return !q || [k.name, k.slug, k.curator ?? "", k.sourceUrl ?? "", k.owner?.email ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [kits, query, kind, state]);

  // Every kit can be selected; combining and refreshing only use the page kits among them.
  const selectable = (k: AdminKit) => Boolean(k);
  const combinable = (k: AdminKit) => k.kind === "page" && k.latest?.status === "ready" && k.latest.visibility === "public";
  const [deleting, setDeleting] = useState<AdminKit[] | null>(null);
  const [withdrawing, setWithdrawing] = useState<AdminKit | null>(null);
  const [showStates, setShowStates] = useState(false);

  const hide = async (list: AdminKit[], hidden: boolean) => {
    await adminSetKitsHidden(list.map((k) => k.id), hidden);
    toast({ title: `${list.length === 1 ? list[0].name : `${list.length} kits`} ${hidden ? "hidden" : "shown again"}`, tone: "success" });
    setSelected(new Set());
    router.refresh();
  };

  const remove = async (list: AdminKit[]) => {
    const { deleted, failed } = await adminDeleteKits(list.map((k) => k.id));
    if (deleted.length) toast({ title: `Deleted ${deleted.length === 1 ? (list.find((k) => k.id === deleted[0])?.name ?? "1 kit") : `${deleted.length} kits`}`, tone: "success" });
    for (const f of failed) toast({ title: `Couldn't delete ${f.slug}`, description: f.error, tone: "danger" });
    setDeleting(null);
    setSelected(new Set());
    router.refresh();
  };
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
        <Segmented value={state} onChange={setState} options={[["all", "Any state"], ["live", "Live"], ["private", "Private"], ["featured", "Featured"], ["hidden", "Hidden"], ["withdrawn", "Withdrawn"]]} />
        <Button className="xl:ml-auto" onClick={() => setAdding(true)}>
          <Plus /> New kit
        </Button>
      </div>

      <div className={cn("grid transition-[grid-template-rows,margin] duration-200 ease-out-soft", showStates ? "mt-3 grid-rows-[1fr]" : "mt-0 grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-[12px] border border-border bg-surface px-4 py-3 sm:grid-cols-2 xl:grid-cols-3">
            {STATES.map(([name, meaning]) => (
              <div key={name}>
                <dt className="text-[12.5px] font-semibold">{name}</dt>
                <dd className="text-[12.5px] leading-relaxed text-fg-muted">{meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className={cn("grid transition-[grid-template-rows,margin] duration-200 ease-out-soft", selected.size ? "mt-3 grid-rows-[1fr]" : "mt-0 grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="flex items-center gap-3 rounded-[12px] border border-accent/40 bg-accent-soft px-4 py-2.5 text-[13px] text-accent-soft-fg">
            <span className="font-medium">{selected.size} selected</span>
            {pickedKits.some(combinable) && (
              <Button size="sm" onClick={() => setCombining(pickedKits.filter(combinable))}>
                <Layers /> Make a taste
              </Button>
            )}
            {pickedKits.some((k) => k.latest?.status === "ready") && (
              <Button size="sm" variant="secondary" onClick={() => void refreshMany(pickedKits.filter((k) => k.latest?.status === "ready"))}>
                <RotateCw /> Refresh
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => void hide(pickedKits, !pickedKits.every((k) => k.hidden))}>
              {pickedKits.every((k) => k.hidden) ? <Eye /> : <EyeOff />} {pickedKits.every((k) => k.hidden) ? "Show" : "Hide"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDeleting(pickedKits)} className="text-danger hover:border-danger">
              <Trash /> Delete
            </Button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto inline-flex items-center gap-1 text-[12.5px] hover:underline">
              <X className="size-3.5" /> Clear
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-[14px] border border-border bg-surface">
        <table className="w-full min-w-[68rem] text-left text-[13px] [&_td]:whitespace-nowrap">
          <thead className="bg-surface-2/50">
            <tr className="border-b border-border text-[11.5px] text-fg-muted">
              <th className="h-10 w-10 pl-4">
                <input
                  type="checkbox"
                  aria-label="Select all kits shown"
                  checked={allShownSelected}
                  onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.filter(selectable).map((k) => k.id)))}
                  className="size-4 accent-[var(--accent)]"
                />
              </th>
              <th className="px-3 font-medium">Kit</th>
              <th className="px-3 font-medium">Kind</th>
              <th className="px-3 font-medium">Owner</th>
              <th className="px-3 font-medium">Version</th>
              <th className="px-3 font-medium">
                <button type="button" onClick={() => setShowStates((v) => !v)} aria-expanded={showStates} className="inline-flex items-center gap-1 hover:text-fg">
                  State <Info className="size-3.5" />
                </button>
              </th>
              <th className="px-3 text-right font-medium">Views</th>
              <th className="px-3 font-medium">Published</th>
              <th className="w-36 px-4"><span className="sr-only">Actions</span></th>
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
                <td className="max-w-44 px-3">
                  {k.owner ? (
                    <a href={`/admin/users/${k.owner.id}`} className="block truncate text-[12.5px] text-fg-muted hover:text-fg hover:underline">{k.owner.email ?? k.owner.id.slice(0, 8)}</a>
                  ) : (
                    <span className="text-[12px] text-fg-subtle">Visitor</span>
                  )}
                </td>
                <td className="px-3 font-mono text-[12px]">v{k.latest?.version}{k.versions > 1 && <span className="text-fg-subtle"> / {k.versions}</span>}</td>
                <td className="px-3">
                  <span className="flex flex-wrap gap-1">
                    {k.latest?.status !== "ready" ? (
                      <span title={STATES[4][1]} className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium text-danger">Withdrawn</span>
                    ) : k.latest.visibility === "private" ? (
                      <span title={STATES[1][1]} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-fg-muted"><LockKeyhole className="size-3" /> Private</span>
                    ) : (
                      <span title={STATES[0][1]} className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent-soft-fg">Live</span>
                    )}
                    {k.stale && k.latest?.status === "ready" && (
                      <span title="Some of its sites have a newer version. Refresh to use them (nothing is rendered again)." className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium text-accent-ink">
                        Sites updated
                      </span>
                    )}
                    {k.featured && <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium">Featured</span>}
                    {k.hidden && <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-fg-muted"><EyeOff className="size-3" /> Hidden</span>}
                  </span>
                </td>
                <td className="px-3 text-right font-mono text-[12px] text-fg-muted" title={`${k.stats.views} views · ${k.stats.likes} likes · ${k.stats.downloads} downloads`}>{k.stats.views.toLocaleString("en-US")}</td>
                <td className="px-3 font-mono text-[12px] text-fg-muted">{when(k.latest?.publishedAt)}</td>
                <td className="px-4">
                  <span className="flex items-center justify-end gap-1">
                    {k.latest?.status === "ready" && (
                      <button
                        type="button"
                        onClick={() => void refresh(k)}
                        disabled={Boolean(refreshing[k.id])}
                        aria-label={`Refresh ${k.name}`}
                        title={k.kind === "page" ? "Analyse the site again (new version)" : "Rebuild from the newest version of each site (seconds, nothing re-rendered)"}
                        className={cn("flex size-8 items-center justify-center rounded-[8px] transition-colors hover:bg-surface-2 hover:text-fg disabled:text-accent-ink", k.stale ? "text-accent-ink" : "text-fg-subtle")}
                      >
                        <RotateCw className={cn("size-4", refreshing[k.id] && "animate-[spin_1s_linear_infinite]")} />
                      </button>
                    )}
                    <button type="button" onClick={() => star(k)} aria-label={k.featured ? "Unfeature" : "Feature"} title={k.featured ? "Unfeature" : "Feature on the homepage"} className={cn("flex size-8 items-center justify-center rounded-[8px] transition-colors hover:bg-surface-2", k.featured ? "text-accent-ink" : "text-fg-subtle")}>
                      <Star className={cn("size-4", k.featured && "fill-current")} />
                    </button>
                    <RowMenu
                      kit={k}
                      onEdit={() => setEditingId(k.id)}
                      onHide={() => void hide([k], !k.hidden)}
                      onWithdraw={() => setWithdrawing(k)}
                      onDelete={() => setDeleting([k])}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="px-4 py-14 text-center text-sm text-fg-muted">No kits match.</p>}
      </div>
      <p className="mt-3 text-[12px] text-fg-subtle">
        {shown.length} of {kits.length} kits. Tick any kits to hide, delete or refresh them; tick page kits to make a taste. Refreshing renders the site again and publishes a new version; keep this tab open until it finishes.
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
      <DangerDialog
        open={Boolean(deleting)}
        title={deleting?.length === 1 ? `Delete ${deleting[0].name}?` : `Delete ${deleting?.length ?? 0} kits?`}
        description={<>Every version, file, frame and count goes, and their links stop working. This can&apos;t be undone. A kit that a taste or multi-page kit is built from is kept; delete that one first.</>}
        items={(deleting ?? []).map((k) => `${k.slug} · ${k.versions} version${k.versions === 1 ? "" : "s"}`)}
        confirmLabel={deleting?.length === 1 ? "Delete kit" : `Delete ${deleting?.length ?? 0} kits`}
        typeToConfirm={(deleting?.length ?? 0) > 1 || deleting?.some((k) => k.latest?.status === "ready" && k.latest.visibility === "public") ? "delete" : undefined}
        onConfirm={() => remove(deleting ?? [])}
        onClose={() => setDeleting(null)}
      />
      <DangerDialog
        open={Boolean(withdrawing)}
        title={`Withdraw ${withdrawing?.name ?? ""} v${withdrawing?.latest?.version ?? ""}?`}
        description="Its files are removed and its links answer 410 Gone. The record stays (shown as Withdrawn). Use this for a takedown; use Delete to remove a kit completely."
        confirmLabel="Withdraw"
        onConfirm={async () => {
          if (!withdrawing?.latest) return;
          await adminWithdrawVersion(withdrawing.latest.versionId);
          toast({ title: `${withdrawing.name} v${withdrawing.latest.version} withdrawn`, tone: "success" });
          setWithdrawing(null);
          router.refresh();
        }}
        onClose={() => setWithdrawing(null)}
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

function RowMenu({ kit, onEdit, onHide, onWithdraw, onDelete }: { kit: AdminKit; onEdit: () => void; onHide: () => void; onWithdraw: () => void; onDelete: () => void }) {
  const item = "flex cursor-default items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-surface-2";
  const live = kit.latest?.status === "ready";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger aria-label={`More actions for ${kit.name}`} className="flex size-8 items-center justify-center rounded-[8px] text-fg-subtle outline-none transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent data-[state=open]:bg-surface-2">
        <Ellipsis className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-52 rounded-[12px] border border-border bg-surface p-1.5 shadow-card">
          {live && kit.latest?.visibility === "public" && (
            <DropdownMenu.Item asChild className={item}>
              <a href={`/k/${kit.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4 text-fg-subtle" /> Open its page
              </a>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className={item} onSelect={onEdit}>
            <Pencil className="size-4 text-fg-subtle" /> Edit name, cover, taste
          </DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={onHide}>
            {kit.hidden ? <Eye className="size-4 text-fg-subtle" /> : <EyeOff className="size-4 text-fg-subtle" />} {kit.hidden ? "Show in the library" : "Hide from the library"}
          </DropdownMenu.Item>
          {live && (
            <DropdownMenu.Item className={item} onSelect={onWithdraw}>
              <X className="size-4 text-fg-subtle" /> Withdraw v{kit.latest?.version}
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={cn(item, "text-danger data-[highlighted]:bg-danger-soft")} onSelect={onDelete}>
            <Trash className="size-4" /> Delete kit
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
