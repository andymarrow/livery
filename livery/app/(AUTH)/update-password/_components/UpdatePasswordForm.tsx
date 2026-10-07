"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions/updatePassword";
import type { AuthResult } from "@/app/actions/signIn";
import { Button } from "@/components/ui/button";
import { AuthHeading, Field, fieldClass, FormMessage } from "../../_components/Fields";

export function UpdatePasswordForm() {
  const [result, action, pending] = useActionState<AuthResult, FormData>(updatePassword, null);
  return (
    <>
      <AuthHeading title="Choose a New Password" lead="At least 8 characters. You'll stay signed in on this device." />
      <form action={action} className="space-y-4">
        <Field label="New password">
          <input name="password" type="password" autoComplete="new-password" required minLength={8} className={fieldClass} />
        </Field>
        <Field label="Type it again">
          <input name="confirm" type="password" autoComplete="new-password" required minLength={8} className={fieldClass} />
        </Field>
        {result && !result.ok && <FormMessage tone="error">{result.error}</FormMessage>}
        <Button type="submit" disabled={pending} className="h-11 w-full">
          {pending ? "Saving…" : "Save Password"}
        </Button>
      </form>
    </>
  );
}
