"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions/deleteAccount";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DELETE_ACCOUNT_PHRASE as CONFIRM_PHRASE } from "@/constants/constants";

// The last section of /me: delete the account, after typing a phrase.
export function DeleteAccount({ privateKits }: { privateKits: number }) {
  const [state, action, pending] = useActionState(deleteAccount, { error: null });
  const [typed, setTyped] = useState("");
  const ready = typed.trim().toLowerCase() === CONFIRM_PHRASE;
  return (
    <section id="delete" className="mt-14 scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight">Delete Your Account</h2>
      <div className="mt-5 flex flex-col gap-4 rounded-[18px] border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-fg-muted">
          Removes your profile, saved kits, browser connections, your private kits and the pages you measured for them. Kits you published stay in the library, no longer linked to you.
        </p>
        <Dialog onOpenChange={(open) => !open && setTyped("")}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="shrink-0 text-danger hover:border-danger">
              Delete account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle className="text-lg font-semibold tracking-tight">Delete your account?</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-fg-muted">
              {privateKits > 0 ? `Your ${privateKits === 1 ? "private kit" : `${privateKits} private kits`} and the pages measured for ${privateKits === 1 ? "it" : "them"} go with it. ` : ""}
              This can&apos;t be undone.
            </DialogDescription>
            <form action={action} className="mt-5">
              <label htmlFor="confirm-delete" className="text-[13px] text-fg-muted">
                Type <span className="font-mono text-fg">{CONFIRM_PHRASE}</span> to confirm
              </label>
              <Input id="confirm-delete" name="confirm" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-2" />
              {state.error && (
                <p role="alert" className="mt-2 text-[13px] text-danger">
                  {state.error}
                </p>
              )}
              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={!ready || pending} className="bg-danger text-bg hover:bg-danger hover:opacity-90">
                  {pending ? "Deleting…" : "Delete my account"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
