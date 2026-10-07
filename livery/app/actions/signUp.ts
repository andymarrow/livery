"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { withinEmailBudget } from "@/lib/auth/limit";
import { authMessage } from "@/lib/auth/messages";
import { originOf, safeNext } from "@/lib/auth/redirect";
import { sendEmail } from "@/lib/email/send";
import { confirmEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";
import type { AuthResult } from "./signIn";

const Form = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters.").max(72),
  next: z.string().optional(),
});

/**
 * Creates the account (unconfirmed) and emails a confirmation link. Supabase
 * makes the link but sends nothing; Livery sends it through Resend.
 */
export async function signUp(_prev: AuthResult, form: FormData): Promise<AuthResult> {
  const parsed = Form.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!(await withinEmailBudget("signup"))) return { ok: false, error: authMessage("rate limit") };
  const origin = originOf(await headers());
  const next = safeNext(parsed.data.next);

  const { data, error } = await getAdminClient().auth.admin.generateLink({
    type: "signup",
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.name } },
  });
  if (error || !data.properties?.hashed_token) return { ok: false, error: authMessage(error?.message ?? "") };

  const link = `${origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=signup&next=${encodeURIComponent(next)}`;
  try {
    await sendEmail({ to: parsed.data.email, ...confirmEmail(link) });
  } catch (sendError) {
    logger.error("auth.signup_email_failed", { error: sendError instanceof Error ? sendError.message : String(sendError) });
    return { ok: false, error: "Your account was created, but the confirmation email couldn't be sent. Try signing up again in a minute." };
  }
  return { ok: true, message: `We sent a confirmation link to ${parsed.data.email}. Open it to finish signing up.` };
}
