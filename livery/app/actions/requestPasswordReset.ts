"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { withinEmailBudget } from "@/lib/auth/limit";
import { authMessage } from "@/lib/auth/messages";
import { originOf } from "@/lib/auth/redirect";
import { sendEmail } from "@/lib/email/send";
import { resetPasswordEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";
import type { AuthResult } from "./signIn";

const Form = z.object({ email: z.email("Enter a valid email.") });

/** Always answers the same way, so it can't be used to find out who has an account. */
export async function requestPasswordReset(_prev: AuthResult, form: FormData): Promise<AuthResult> {
  const parsed = Form.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!(await withinEmailBudget("reset"))) return { ok: false, error: authMessage("rate limit") };
  const origin = originOf(await headers());
  const { data } = await getAdminClient().auth.admin.generateLink({ type: "recovery", email: parsed.data.email });
  if (data?.properties?.hashed_token) {
    const link = `${origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=/update-password`;
    await sendEmail({ to: parsed.data.email, ...resetPasswordEmail(link) }).catch((error) => logger.error("auth.reset_email_failed", { error: error instanceof Error ? error.message : String(error) }));
  }
  return { ok: true, message: `If there's an account for ${parsed.data.email}, a reset link is on its way.` };
}
