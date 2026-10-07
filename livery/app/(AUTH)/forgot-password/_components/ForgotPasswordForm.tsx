"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/requestPasswordReset";
import type { AuthResult } from "@/app/actions/signIn";
import { ArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { AuthHeading, Field, fieldClass, FormMessage } from "../../_components/Fields";

export function ForgotPasswordForm() {
  const [result, action, pending] = useActionState<AuthResult, FormData>(requestPasswordReset, null);
  return (
    <>
      <AuthHeading title="Reset Your Password" lead="Enter your email and we'll send you a link to choose a new password." />
      <form action={action} className="space-y-4">
        <Field label="Email">
          <input name="email" type="email" autoComplete="email" required className={fieldClass} placeholder="you@example.com" />
        </Field>
        {result && <FormMessage tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</FormMessage>}
        <Button type="submit" disabled={pending} className="h-11 w-full">
          {pending ? "Sending…" : "Send Reset Link"}
        </Button>
      </form>
      <Link href="/sign-in" className="mt-6 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Back to sign in
      </Link>
    </>
  );
}
