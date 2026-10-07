"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/signUp";
import type { AuthResult } from "@/app/actions/signIn";
import { MailCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { AuthHeading, Field, fieldClass, FormMessage } from "../../_components/Fields";
import { OrDivider, ProviderButtons } from "../../_components/ProviderButtons";

export function SignUpForm({ next }: { next?: string }) {
  const [result, action, pending] = useActionState<AuthResult, FormData>(signUp, null);
  if (result?.ok) {
    return (
      <div>
        <span className="flex size-12 items-center justify-center rounded-[14px] border border-border bg-surface text-accent-ink">
          <MailCheck className="size-6" />
        </span>
        <h1 className="mt-6 text-[28px] font-bold tracking-tight">Check Your Inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{result.message}</p>
        <p className="mt-6 text-[13px] text-fg-subtle">No email after a few minutes? Check spam, or sign up again with the same address to resend it.</p>
      </div>
    );
  }
  return (
    <>
      <AuthHeading title="Create Your Account" lead="Free. Keep private kits, save the ones you like, and use the browser extension." />
      <ProviderButtons next={next} label="Sign up" />
      <OrDivider />
      <form action={action} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <Field label="Name">
          <input name="name" autoComplete="name" required maxLength={80} className={fieldClass} placeholder="Andy" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" autoComplete="email" required className={fieldClass} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <input name="password" type="password" autoComplete="new-password" required minLength={8} className={fieldClass} placeholder="At least 8 characters" />
        </Field>
        {result && !result.ok && <FormMessage tone="error">{result.error}</FormMessage>}
        <Button type="submit" disabled={pending} className="h-11 w-full">
          {pending ? "Creating your account…" : "Create Account"}
        </Button>
        <p className="text-center text-[12px] leading-relaxed text-fg-subtle">
          By creating an account you agree to the{" "}
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-fg">terms</Link> and{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-fg">privacy policy</Link>.
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{" "}
        <Link href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-accent-ink underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
          Sign in
        </Link>
      </p>
    </>
  );
}
