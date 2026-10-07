"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminSession";
import { logger } from "@/lib/logger";
import { withdrawVersion } from "@/services/withdraw";

export async function adminWithdrawVersion(versionId: string) {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(versionId)) throw new Error("bad version id");
  await withdrawVersion(versionId);
  logger.info("admin.withdrew_version", { versionId });
  revalidatePath("/admin");
}
