"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { extensionPairingStatus } from "@/app/actions/extensionPairingStatus";
import { CircleCheck, Puzzle } from "@/components/icons";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";

export function PairingCode({ code, expiresInSeconds, issuedAt }: { code: string; expiresInSeconds: number; issuedAt: string }) {
  const [connected, setConnected] = useState(false);
  const [left, setLeft] = useState(expiresInSeconds);

  useEffect(() => {
    if (connected) return;
    const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const poll = setInterval(async () => {
      const status = await extensionPairingStatus(issuedAt).catch(() => null);
      if (status?.connected) setConnected(true);
    }, 2000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [connected, issuedAt]);

  if (connected) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-[16px] bg-accent-soft text-accent-ink">
          <CircleCheck className="size-6" />
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Extension Connected</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">Open a page you&apos;re signed into, click the Livery icon, and add it to a kit. It stays private until you publish it.</p>
        <Button asChild variant="secondary" className="mt-8">
          <Link href="/me">Go to My kits</Link>
        </Button>
      </div>
    );
  }

  const expired = left === 0;
  return (
    <div className="mx-auto w-full max-w-md text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-[16px] border border-border bg-surface text-accent-ink">
        <Puzzle className="size-6" />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Connect the Extension</h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">The Livery extension picks this code up on its own. If it asks, type it in.</p>

      <div
        id="livery-pairing"
        data-livery-pairing-code={expired ? undefined : code}
        className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-[18px] border border-border bg-surface py-3 pl-6 pr-3 shadow-card"
      >
        <span className={`font-mono text-3xl font-semibold tracking-[0.18em] ${expired ? "text-fg-subtle line-through" : ""}`}>{code}</span>
        {!expired && <CopyButton value={code.replace("-", "")} label="Copy code" variant="ghost" size="icon-sm" />}
      </div>
      <p className="mt-3 text-[12.5px] text-fg-subtle tabular">
        {expired ? (
          <>
            This code expired.{" "}
            <button type="button" onClick={() => window.location.reload()} className="font-medium text-fg underline underline-offset-4">
              Get a new one
            </button>
          </>
        ) : (
          <>Works once, for {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} more. Waiting for the extension…</>
        )}
      </p>
    </div>
  );
}
