import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";

// Connecting the extension to an account. The signed-in site shows a short
// one-time code; the extension trades it for a long token. Both are stored
// only as sha256 hashes. Tokens last 90 days and can be revoked from /me.

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const CODE_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const normaliseCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function createPairingCode(userId: string) {
  const raw = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  const db = getAdminClient();
  await db.from("extension_pairings").delete().eq("user_id", userId).is("used_at", null);
  const { error } = await db.from("extension_pairings").insert({ code_hash: sha256(raw), user_id: userId, expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString() });
  if (error) throw error;
  return { code: `${raw.slice(0, 4)}-${raw.slice(4)}`, expiresInSeconds: CODE_TTL_MS / 1000 };
}

/** Trades a fresh, unused code for a token. Null when the code is wrong, used or expired. */
export async function redeemPairingCode(code: string, label: string) {
  const db = getAdminClient();
  const normal = normaliseCode(code);
  if (normal.length !== 8) return null;
  const { data: pairing } = await db
    .from("extension_pairings")
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", sha256(normal))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id")
    .maybeSingle();
  if (!pairing) return null;
  const token = `lv_${randomBytes(32).toString("base64url")}`;
  const { error } = await db.from("extension_tokens").insert({
    user_id: pairing.user_id,
    token_hash: sha256(token),
    label: label.slice(0, 120) || "Browser extension",
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });
  if (error) throw error;
  return { token, userId: pairing.user_id };
}

/** Whether a pairing code has been used (the connect page shows "Connected"). */
export async function pairingUsed(userId: string) {
  const { data } = await getAdminClient().from("extension_pairings").select("used_at").eq("user_id", userId).not("used_at", "is", null).order("used_at", { ascending: false }).limit(1).maybeSingle();
  return data?.used_at ?? null;
}

/** The account behind an extension request, from its "Authorization: Bearer lv_…" header. */
export async function extensionUser(headers: Headers) {
  const token = headers.get("authorization")?.match(/^Bearer\s+(lv_[A-Za-z0-9_-]{20,})$/)?.[1];
  if (!token) return null;
  const db = getAdminClient();
  const { data } = await db
    .from("extension_tokens")
    .select("id, user_id, expires_at, revoked_at")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (!data || data.revoked_at || new Date(data.expires_at) < new Date()) return null;
  void db.from("extension_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
  return { userId: data.user_id, tokenId: data.id };
}

export async function revokeToken(tokenId: string, userId: string) {
  await getAdminClient().from("extension_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", tokenId).eq("user_id", userId);
}
