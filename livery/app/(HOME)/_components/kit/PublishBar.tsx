"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishKitVersion } from "@/app/actions/publishKitVersion";
import { Globe, LockKeyhole } from "@/components/icons";
import { Button } from "@/components/ui/button";

// The owner's choice for a private version: keep it to yourself, or publish
// it to the library for good. Publishing asks once, in place.
export function PublishBar({ versionId, title, version }: { versionId: string; title: string; version: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-8 flex flex-col gap-4 rounded-[18px] border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-surface-2 text-fg-muted">
        <LockKeyhole className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold tracking-tight">{confirming ? `Publish v${version} to the library?` : "Only you can see this version"}</p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-fg-muted">
          {confirming
            ? `Anyone will be able to find and install ${title} v${version}, including the measurements of the pages you added behind a login (never their text or images). This can't be undone.`
            : "It isn't in the library or search. Publish it when you're happy to share its design."}
        </p>
        {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        {confirming && (
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
            Not yet
          </Button>
        )}
        <Button
          disabled={pending}
          onClick={() => {
            if (!confirming) return setConfirming(true);
            start(async () => {
              const result = await publishKitVersion(versionId);
              if (result.ok) router.refresh();
              else setError(result.error);
            });
          }}
        >
          <Globe /> {pending ? "Publishing…" : confirming ? "Yes, publish" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
