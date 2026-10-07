"use server";

import { revalidatePath } from "next/cache";
import { revokeToken } from "@/lib/extension/tokens";
import { currentUser } from "@/utils/supabase/server";

export async function disconnectExtension(tokenId: string) {
  const user = await currentUser();
  if (!user) return;
  await revokeToken(tokenId, user.id);
  revalidatePath("/me");
}
