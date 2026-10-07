"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminSignIn, type AdminSignInResult } from "@/app/actions/adminSignIn";
import { LockKeyhole } from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  const router = useRouter();
  const [result, action, pending] = useActionState<AdminSignInResult | null, FormData>(adminSignIn, null);
  useEffect(() => {
    if (result?.ok) router.refresh();
  }, [result, router]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24">
      <form action={action} className="w-full max-w-sm rounded-[18px] border border-border bg-surface p-7 shadow-card">
        <div className="flex items-center gap-2">
          <LogoMark />
          <span className="text-[17px] font-semibold tracking-tight">livery</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-fg-muted">
            <LockKeyhole className="size-3" /> Admin
          </span>
        </div>
        <h1 className="mt-8 text-2xl font-bold tracking-tight">Sign In</h1>
        <p className="mt-1.5 text-sm text-fg-muted">Use the ADMIN_SECRET from your environment.</p>
        <label className="mt-6 block">
          <span className="sr-only">Admin secret</span>
          <Input name="secret" type="password" autoComplete="current-password" required autoFocus placeholder="Admin secret" aria-invalid={result?.ok === false || undefined} className="h-11 rounded-full px-4" />
        </label>
        {result?.ok === false && <p role="alert" className="mt-2 px-1 text-[13px] text-danger">{result.error}</p>}
        <Button type="submit" disabled={pending} className="mt-5 h-11 w-full">
          {pending ? "Checking…" : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
