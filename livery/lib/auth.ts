import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Constant-time check of "Authorization: Bearer <secret>" against an env secret. */
export function hasBearer(headers: Headers, secretName: "CRON_SECRET" | "ADMIN_SECRET") {
  const secret = process.env[secretName];
  const given = headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length < 16 || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}
