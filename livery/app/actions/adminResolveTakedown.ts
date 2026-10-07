"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminSession";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";
import { applyTakedown } from "@/services/grants";

/** "action": the host is forbidden and every kit withdrawn. "reject": closed, nothing changes. */
export async function adminResolveTakedown(id: number, decision: "action" | "reject") {
  await requireAdmin();
  const db = getAdminClient();
  const { data: request, error } = await db.from("takedown_requests").select("id, domain, status").eq("id", id).single();
  if (error) throw error;
  if (request.status !== "open") return;
  if (decision === "action") {
    const withdrawn = await applyTakedown(request.domain);
    logger.info("admin.takedown_actioned", { domain: request.domain, withdrawn });
  }
  await db.from("takedown_requests").update({ status: decision === "action" ? "actioned" : "rejected" }).eq("id", id);
  revalidatePath("/admin");
}
