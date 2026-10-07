"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authMessage } from "@/lib/auth/messages";
import { createClient } from "@/utils/supabase/server";
import type { AuthResult } from "./signIn";

const Form = z
  .object({ password: z.string().min(8, "Use at least 8 characters.").max(72), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The two passwords don't match.", path: ["confirm"] });

export async function updatePassword(_prev: AuthResult, form: FormData): Promise<AuthResult> {
  const parsed = Form.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Your reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: authMessage(error.message) };
  redirect("/me?password=updated");
}
