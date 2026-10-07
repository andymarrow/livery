"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthResult } from "@/app/actions/signIn";
import { Button } from "@/components/ui/button";
import { AuthHeading, Field, fieldClass, FormMessage } from "../../_components/Fields";
import { OrDivider, ProviderButtons } from "../../_components/ProviderButtons";

export function SignInForm({ next, error }: { next?: string; error?: string }) {
  const [result, action, pending] = useActionState<AuthResult, FormData>(signIn, null);
  const message = result && !result.ok ? result.error : error;
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <>
      <AuthHeading title="Welcome Back" lead="Sign in to see your kits, private pages and saved library." />
      <ProviderButtons next={next} />
      <OrDivider />
      <form action={action} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <Field label="Email">
          <input name="email" type="email" autoComplete="email" required className={fieldClass} placeholder="you@example.com" />
        </Field>
        <Field
          label="Password"
          aside={
            <Link href="/forgot-password" className="text-[12.5px] font-normal text-fg-muted hover:text-fg">
              Forgot it?
            </Link>
          }
        >
          <input name="password" type="password" autoComplete="current-password" required className={fieldClass} />
        </Field>
        {message && <FormMessage tone="error">{message}</FormMessage>}
        <Button type="submit" disabled={pending} className="h-11 w-full">
          {pending ? "Signing in…" : "Sign In"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        New to Livery?{" "}
        <Link href={`/sign-up${nextQuery}`} className="font-medium text-accent-ink underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
          Create an account
        </Link>
      </p>
    </>
  );
}
