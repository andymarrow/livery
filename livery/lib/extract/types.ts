import type { ReadFailureReason } from "@/lib/supabase/database.types";

export type { ReadFailureReason };

export type ReadFailure = {
  ok: false;
  reason: ReadFailureReason;
  detail?: string;
  /** Seconds until it is worth trying this URL again. */
  retryAfter?: number;
};

export type ReadSuccess<T> = { ok: true; value: T };

export type ReadResult<T> = ReadSuccess<T> | ReadFailure;

export function fail(reason: ReadFailureReason, detail?: string): ReadFailure {
  return { ok: false, reason, detail, retryAfter: RETRY_AFTER_SECONDS[reason] };
}

const HOUR = 3600;

// How long a failure is remembered before we try the site again.
// Transient problems (timeouts, empty renders) expire quickly.
export const RETRY_AFTER_SECONDS: Record<ReadFailureReason, number> = {
  bot_protection: 24 * HOUR,
  login_required: 24 * HOUR,
  empty_render: 1 * HOUR,
  not_found: 24 * HOUR,
  robots_disallowed: 24 * HOUR,
  unsafe_url: 24 * HOUR,
  timeout: 1 * HOUR,
  sensitive_page: 24 * HOUR,
  blocked_by_owner: 24 * HOUR,
};
