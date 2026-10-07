"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authMessage } from "@/lib/auth/messages";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/utils/supabase/server";

export type AuthResult = { ok: false; error: string } | { ok: true; message?: string } | null;

const Form = z.object({ email: z.email("Enter a valid email."), password: z.string().min(1, "Enter your password."), next: z.string().optional() });

export async function signIn(_prev: AuthResult, form: FormData): Promise<AuthResult> {
  const parsed = Form.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { ok: false, error: authMessage(error.message) };
  redirect(safeNext(parsed.data.next));
}
