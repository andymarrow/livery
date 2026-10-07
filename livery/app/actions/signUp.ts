"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { authMessage } from "@/lib/auth/messages";
import { originOf, safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/utils/supabase/server";
import type { AuthResult } from "./signIn";

const Form = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters.").max(72),
  next: z.string().optional(),
});

export async function signUp(_prev: AuthResult, form: FormData): Promise<AuthResult> {
  const parsed = Form.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const origin = originOf(await headers());
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(safeNext(parsed.data.next))}`,
    },
  });
  if (error) return { ok: false, error: authMessage(error.message) };
  // Supabase hides whether an address is taken: an existing account comes back with no identities.
  if (data.user && data.user.identities?.length === 0) return { ok: false, error: authMessage("already registered") };
  return { ok: true, message: `We sent a confirmation link to ${parsed.data.email}. Open it to finish signing up.` };
}
