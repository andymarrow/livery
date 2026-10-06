import "server-only";
import { logger } from "@/lib/logger";
import { isOptOut, lookupGrant, type GrantFile } from "@/lib/optin/grant";
import type { Grant } from "@/lib/optin/schema";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { withdrawVersions } from "./withdraw";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type SiteGrant =
  | { status: "none" }
  | { status: "granted"; grant: Grant; hash: string; raw: string }
  | { status: "forbidden"; reason: "opt_out" | "takedown" };

type StoredDoc = { source: "file" | "takedown"; hash?: string; raw?: string; path?: string } | null;

function fromRow(optIn: string, doc: StoredDoc): SiteGrant {
  if (optIn === "forbidden") return { status: "forbidden", reason: doc?.source === "takedown" ? "takedown" : "opt_out" };
  if (optIn === "granted" && doc?.raw && doc.hash) {
    try {
      return { status: "granted", grant: JSON.parse(doc.raw) as Grant, hash: doc.hash, raw: doc.raw };
    } catch {
      return { status: "none" };
    }
  }
  return { status: "none" };
}

/**
 * The owner's current decision for a host, fetched at most once a day.
 * A change is enforced immediately: opting out withdraws everything, and a
 * changed or removed grant withdraws versions built under the old one.
 */
export async function getSiteGrant(domain: string, { force = false }: { force?: boolean } = {}): Promise<SiteGrant> {
  const db = getAdminClient();
  const { data: site, error } = await db.from("sites").select("opt_in, grant_doc, grant_checked_at").eq("domain", domain).maybeSingle();
  if (error) throw error;
  const stored = (site?.grant_doc ?? null) as StoredDoc;

  // A takedown is permanent; a later file can't undo it.
  if (site?.opt_in === "forbidden" && stored?.source === "takedown") return { status: "forbidden", reason: "takedown" };
  const fresh = site?.grant_checked_at && Date.now() - new Date(site.grant_checked_at).getTime() < MAX_AGE_MS;
  if (site && fresh && !force) return fromRow(site.opt_in, stored);

  const lookup = await lookupGrant(domain);
  const file: GrantFile | null = lookup.file;
  const next: SiteGrant = !file ? { status: "none" } : isOptOut(file.grant) ? { status: "forbidden", reason: "opt_out" } : { status: "granted", grant: file.grant, hash: file.hash, raw: file.raw };

  const doc: StoredDoc = file ? { source: "file", hash: file.hash, raw: file.raw, path: file.source } : null;
  const { error: upsertError } = await db.from("sites").upsert({
    domain,
    opt_in: next.status,
    grant_doc: doc as unknown as Json,
    grant_checked_at: new Date().toISOString(),
  });
  if (upsertError) throw upsertError;

  const previousHash = stored?.source === "file" ? (stored.hash ?? null) : null;
  if (next.status === "forbidden") await withdrawVersions(domain, { all: true });
  else if (previousHash && previousHash !== (next.status === "granted" ? next.hash : null)) {
    await withdrawVersions(domain, { all: false, keepHash: next.status === "granted" ? next.hash : null });
  }
  if ((site?.opt_in ?? "none") !== next.status) logger.info("grant.changed", { domain, from: site?.opt_in ?? "none", to: next.status });
  return next;
}

/** Records a takedown: permanent opt-out plus immediate withdrawal of every version. */
export async function applyTakedown(domain: string) {
  const db = getAdminClient();
  const { error } = await db.from("sites").upsert({
    domain,
    opt_in: "forbidden",
    grant_doc: { source: "takedown" } as unknown as Json,
    grant_checked_at: new Date().toISOString(),
  });
  if (error) throw error;
  return withdrawVersions(domain, { all: true });
}
