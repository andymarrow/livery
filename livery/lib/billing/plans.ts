// Plans and their limits. Livery is generous: browsing, installing and
// downloading kits are free and unlimited for everyone. The numbers here are
// defaults; the admin changes them at runtime (app_settings), along with
// whether payments are switched on at all.

export type Plan = "visitor" | "free" | "pro";
export type PlanLimits = { buildsPerHour: number; capturesPerHour: number; tasteSites: number; privateCombined: boolean };
export type Limits = Record<Plan, PlanLimits>;
export type BillingInterval = "month" | "year";
export type Prices = Record<BillingInterval, number>;
export type BillingSettings = { enabled: boolean; limits: Limits; prices: Prices };

export const DEFAULT_LIMITS: Limits = {
  visitor: { buildsPerHour: 10, capturesPerHour: 0, tasteSites: 5, privateCombined: false },
  free: { buildsPerHour: 20, capturesPerHour: 40, tasteSites: 5, privateCombined: false },
  pro: { buildsPerHour: 100, capturesPerHour: 200, tasteSites: 12, privateCombined: true },
};

export const DEFAULT_PRICES: Prices = { month: 9.99, year: 99 };

/** "$9.99", or "$99" for whole dollars. */
export const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Whole months a yearly plan saves over paying monthly (0 when it saves none). */
export const monthsFree = (p: Prices) => (p.month > 0 ? Math.max(0, Math.round(12 - p.year / p.month)) : 0);

export const DEFAULT_SETTINGS: BillingSettings = { enabled: false, limits: DEFAULT_LIMITS, prices: DEFAULT_PRICES };

/** The most sites any kit can combine (the database allows 12 sources). */
export const MAX_SITES = 12;

