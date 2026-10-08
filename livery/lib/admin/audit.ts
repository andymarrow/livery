import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminClient } from "@/lib/supabase/admin";
import { errorText, logger } from "@/lib/logger";

/** Records an admin action. Never fails the action itself (the log may not exist before its migration runs). */
export async function audit(action: string, target: string | null, detail: Record<string, unknown> = {}) {
  logger.info(`admin.${action}`, { target, ...detail });
  const { error } = await getAdminClient().from("admin_audit").insert({ action, target: target?.slice(0, 200) ?? null, detail: detail as Json });
  if (error) logger.warn("admin.audit_failed", { action, error: errorText(error) });
}

/** A missing database function or table means a migration hasn't been run yet. */
export function missingMigration(error: unknown) {
  const text = errorText(error);
  return /PGRST202|PGRST205|42883|42P01|Could not find the (function|table)/.test(text);
}
