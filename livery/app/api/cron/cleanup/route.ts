import type { NextRequest } from "next/server";
import { hasBearer } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { getSiteGrant } from "@/services/grants";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily housekeeping (Vercel Cron sends Authorization: Bearer CRON_SECRET):
 * 1. prune rate-limit windows and stale "couldn't read" memories,
 * 2. delete frames of replaced (30+ days) and withdrawn versions,
 * 3. re-check every opted-in site's grant, which withdraws versions whose grant changed.
 */
export async function GET(request: NextRequest) {
  if (!hasBearer(request.headers, "CRON_SECRET")) return new Response("Unauthorized", { status: 401 });
  if (!supabaseConfigured()) return new Response("Not configured", { status: 503 });
  const db = getAdminClient();
  const report = { pruned: false, framesRemoved: 0, grantsChecked: 0, grantErrors: 0 };

  const { error: pruneError } = await db.rpc("prune_ephemeral");
  report.pruned = !pruneError;

  const { data: stale } = await db.rpc("stale_frame_versions", {});
  const paths = (stale ?? []).flatMap((v) => ["desktop", "tablet", "mobile", "02-desktop", "03-desktop", "04-desktop", "05-desktop"].map((n) => `${v.kit_version_id}/${n}.webp`));
  for (let i = 0; i < paths.length; i += 100) {
    const { data } = await db.storage.from("screenshots").remove(paths.slice(i, i + 100));
    report.framesRemoved += data?.length ?? 0;
  }

  const { data: granted } = await db.from("sites").select("domain").eq("opt_in", "granted").limit(500);
  for (const site of granted ?? []) {
    try {
      await getSiteGrant(site.domain, { force: true });
      report.grantsChecked++;
    } catch (error) {
      report.grantErrors++;
      logger.warn("cron.grant_check_failed", { domain: site.domain, error: error instanceof Error ? error.message : String(error) });
    }
  }

  logger.info("cron.cleanup", report);
  return Response.json(report);
}
