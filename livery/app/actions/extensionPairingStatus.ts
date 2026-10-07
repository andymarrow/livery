"use server";

import { pairingUsed } from "@/lib/extension/tokens";
import { currentUser } from "@/utils/supabase/server";

/** Whether the code shown since `since` has been used by the extension. */
export async function extensionPairingStatus(since: string) {
  const user = await currentUser();
  if (!user) return { connected: false };
  const used = await pairingUsed(user.id);
  return { connected: Boolean(used && used >= since) };
}
