"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { originOf } from "@/lib/auth/redirect";
import { createClient } from "@/utils/supabase/server";
import type { AuthResult } from "./signIn";

const Form = z.object({ email: z.email("Enter a valid email.") });

/** Always answers the same way, so it can't be used to find out who has an account. */
export async function requestPasswordReset(_prev: AuthResult, form: FormData): Promise<AuthResult> {
  const parsed = Form.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const origin = originOf(await headers());
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${origin}/auth/confirm?next=/update-password` });
  return { ok: true, message: `If there's an account for ${parsed.data.email}, a reset link is on its way.` };
}
