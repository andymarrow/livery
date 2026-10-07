import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// The admin area has one key: ADMIN_SECRET. Signing in proves you know it;
// the cookie then holds an HMAC derived from it (never the secret itself),
// so rotating ADMIN_SECRET signs every session out.

export const ADMIN_COOKIE = "livery_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.ADMIN_SECRET;
  return value && value.length >= 16 ? value : null;
}

function token(key: string) {
  return createHmac("sha256", key).update("livery-admin-session-v1").digest("hex");
}

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function adminConfigured() {
  return secret() !== null;
}

/** Constant-time check of a typed secret. */
export function secretMatches(given: string) {
  const key = secret();
  return key !== null && same(given, key);
}

export async function startAdminSession() {
  const key = secret();
  if (!key) return;
  (await cookies()).set(ADMIN_COOKIE, token(key), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: MAX_AGE });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin() {
  const key = secret();
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(key && value && same(value, token(key)));
}

/** Every admin action calls this first: server actions are public endpoints. */
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not signed in as admin");
}
