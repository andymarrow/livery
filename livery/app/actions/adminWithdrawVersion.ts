"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/adminSession";
import { withdrawVersion } from "@/services/withdraw";

export async function adminWithdrawVersion(versionId: string) {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(versionId)) throw new Error("bad version id");
  await withdrawVersion(versionId);
  await audit("version_withdrawn", versionId);
  revalidatePath("/admin");
}
