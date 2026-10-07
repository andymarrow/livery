"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminRemoveCover, adminSetCover } from "@/app/actions/adminSetCover";
import { adminUpdateKit } from "@/app/actions/adminUpdateKit";
import { adminWithdrawVersion } from "@/app/actions/adminWithdrawVersion";
import { ExternalLink, Layers, RotateCw, Trash2, Upload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toaster";
import { kitPath } from "@/lib/kit/urls";
import type { AdminKit } from "@/services/admin";
import { ConfirmAction } from "./ConfirmAction";
import { Field, inputClass, KindBadge, Switch } from "./Controls";
import { refreshKit } from "./refreshKit";

// Everything an admin can change about one kit. Published files are permanent
// (agents pin them by sha256), so content changes publish a new version.
export function KitEditor({ kit, onClose, onAddToTaste }: { kit: AdminKit | null; onClose: () => void; onAddToTaste: (kit: AdminKit) => void }) {
  return (
    <Sheet open={kit !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[min(32rem,100vw)] overflow-y-auto">{kit && <EditorBody key={kit.id} kit={kit} onClose={onClose} onAddToTaste={onAddToTaste} />}</SheetContent>
    </Sheet>
  );
}

function EditorBody({ kit, onClose, onAddToTaste }: { kit: AdminKit; onClose: () => void; onAddToTaste: (kit: AdminKit) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(kit.displayName ?? "");
  const [curator, setCurator] = useState(kit.curator ?? "");
  const [featured, setFeatured] = useState(kit.featured);
  const [hidden, setHidden] = useState(kit.hidden);
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [rebuilding, startRebuild] = useTransition();
  const [step, setStep] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const live = kit.latest?.status === "ready";
  const dirty = displayName !== (kit.displayName ?? "") || curator !== (kit.curator ?? "") || featured !== kit.featured || hidden !== kit.hidden;

  const save = () =>
    startSave(async () => {
      try {
        await adminUpdateKit(kit.id, { displayName: displayName.trim() || null, featured, hidden, ...(kit.kind === "taste" ? { curator: curator.trim() || null } : {}) });
        toast({ title: "Saved", description: `${displayName.trim() || kit.name} is updated across the site.`, tone: "success" });
        router.refresh();
      } catch (error) {
        toast({ title: "Couldn't save", description: error instanceof Error ? error.message : undefined, tone: "danger" });
      }
    });

  const upload = (picked: File) =>
    startUpload(async () => {
      const form = new FormData();
      form.set("kitId", kit.id);
      form.set("file", picked);
      const result = await adminSetCover(form);
      if (result.ok) {
        toast({ title: "Cover updated", tone: "success" });
        router.refresh();
      } else toast({ title: "Couldn't upload", description: result.error, tone: "danger" });
    });

  return (
    <div className="flex min-h-full flex-col">
      <div className="px-6 pb-2 pt-6">
        <div className="flex items-center gap-2 pr-10">
          <KindBadge kind={kit.kind} />
          <span className="font-mono text-[11.5px] text-fg-subtle">{kit.slug}</span>
        </div>
        <SheetTitle className="mt-2 text-xl font-semibold tracking-tight">{kit.name}</SheetTitle>
        <p className="mt-1 text-[12.5px] text-fg-muted">
          v{kit.latest?.version} · {kit.versions} {kit.versions === 1 ? "version" : "versions"} · {live ? "live" : "withdrawn"}
        </p>
      </div>

      <section className="px-6 pt-4">
        <div className="group relative aspect-[16/9] overflow-hidden rounded-[12px] border border-border bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed or public storage URL */}
          {kit.preview && <img src={kit.preview} alt="" className="h-full w-full object-cover object-top" />}
          <span className="absolute left-2 top-2 rounded-md bg-bg/85 px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">{kit.cover ? "Custom cover" : "Layout frame"}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button variant="secondary" size="sm" disabled={uploading} onClick={() => file.current?.click()}>
            <Upload /> {uploading ? "Uploading…" : kit.cover ? "Replace cover" : "Upload a cover"}
          </Button>
          {kit.cover && (
            <ConfirmAction
              label="Remove cover"
              confirm="Remove it?"
              tone="neutral"
              run={async () => {
                await adminRemoveCover(kit.id);
                router.refresh();
              }}
            />
          )}
        </div>
        <p className="mt-2 text-[12px] text-fg-subtle">PNG, JPEG or WebP up to 2 MB. Shown on cards instead of the layout frame; the kit&apos;s files don&apos;t change.</p>
      </section>

      <section className="mt-6 space-y-4 border-t border-border px-6 pt-6">
        <Field label="Display name" hint="Leave empty to use the default.">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} placeholder={kit.name} className={inputClass} />
        </Field>
        {kit.kind === "taste" && (
          <Field label="Whose taste" hint="Changes the person it's listed under.">
            <input value={curator} onChange={(e) => setCurator(e.target.value)} maxLength={40} placeholder="Unnamed" className={inputClass} />
          </Field>
        )}
        <div className="divide-y divide-border rounded-[12px] border border-border px-4">
          <Switch checked={featured} onChange={setFeatured} label="Featured" hint="Leads the homepage and its moving wall." />
          <Switch checked={hidden} onChange={setHidden} label="Hidden from the library" hint="Off Explore, Tastes and the homepage. Its link still works." />
        </div>
        <Button onClick={save} disabled={!dirty || saving} className="w-full">
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </section>

      <section className="mt-6 space-y-2 border-t border-border px-6 py-6">
        <p className="text-[12.5px] font-medium text-fg-muted">Actions</p>
        <Link href={kitPath(kit.slug, kit.latest!.version)} target="_blank" className="flex h-10 items-center gap-2.5 rounded-[10px] border border-border px-3 text-[13px] font-medium transition-colors hover:border-border-strong">
          <ExternalLink className="size-4 text-fg-muted" /> Open the kit page
        </Link>
        {kit.kind === "page" && live && (
          <>
            <button
              type="button"
              onClick={() => onAddToTaste(kit)}
              className="flex h-10 w-full items-center gap-2.5 rounded-[10px] border border-border px-3 text-[13px] font-medium transition-colors hover:border-border-strong"
            >
              <Layers className="size-4 text-fg-muted" /> Add to a taste
            </button>
          </>
        )}
        {live && (
          <button
            type="button"
            disabled={rebuilding}
            onClick={() =>
              startRebuild(async () => {
                const result = await refreshKit(kit, setStep);
                setStep("");
                if (result.ok) {
                  toast({ title: "Refreshed", description: `New version: ${result.path}`, tone: "success" });
                  router.refresh();
                } else toast({ title: "Refresh failed", description: result.error, tone: "danger" });
              })
            }
            className="flex min-h-10 w-full items-center gap-2.5 rounded-[10px] border border-border px-3 py-2 text-left text-[13px] font-medium transition-colors hover:border-border-strong disabled:opacity-80"
          >
            <RotateCw className={rebuilding ? "size-4 shrink-0 animate-[spin_1s_linear_infinite] text-accent-ink" : "size-4 shrink-0 text-fg-muted"} />
            <span>
              {rebuilding ? step || "Refreshing…" : "Refresh: analyse again"}
              <span className="block text-[12px] font-normal text-fg-subtle">
                {rebuilding ? "Keep this open until it finishes." : kit.kind === "page" ? "Renders the site again and publishes a new version." : "Re-analyses every site, then publishes a new version."}
              </span>
            </span>
          </button>
        )}
        {kit.kind !== "page" && (
          <Link href={`/admin/tastes?edit=${kit.id}`} onClick={onClose} className="flex h-10 items-center gap-2.5 rounded-[10px] border border-border px-3 text-[13px] font-medium transition-colors hover:border-border-strong">
            <Layers className="size-4 text-fg-muted" /> Edit its sources
          </Link>
        )}
        {live && (
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-danger/40 px-3 py-2.5">
            <span className="flex items-center gap-2.5 text-[13px] font-medium text-danger">
              <Trash2 className="size-4" /> Withdraw v{kit.latest!.version}
            </span>
            <ConfirmAction
              label="Withdraw"
              confirm="Withdraw for good?"
              run={async () => {
                await adminWithdrawVersion(kit.latest!.versionId);
                toast({ title: `v${kit.latest!.version} withdrawn`, tone: "success" });
                router.refresh();
                onClose();
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
