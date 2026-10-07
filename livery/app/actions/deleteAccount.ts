"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DELETE_ACCOUNT_PHRASE as CONFIRM_PHRASE } from "@/constants/constants";
import { errorText, logger } from "@/lib/logger";
import { deleteAccount as eraseAccount } from "@/services/account";
import { createClient, currentUser } from "@/utils/supabase/server";

/** Deletes the signed-in user's account once they've typed the phrase. */
export async function deleteAccount(_: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/me");
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== CONFIRM_PHRASE) return { error: `Type "${CONFIRM_PHRASE}" to confirm.` };
  try {
    await eraseAccount(user.id);
  } catch (error) {
    logger.error("account.delete_failed", { error: errorText(error) });
    return { error: "Your account couldn't be deleted. Nothing was removed; please try again." };
  }
  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => {});
  revalidatePath("/", "layout");
  redirect("/");
}
