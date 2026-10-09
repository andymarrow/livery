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

/** The comparison on /pricing, in the words people will read. */
export function featuresFor(limits: Limits): { label: string; free: string | boolean; pro: string | boolean }[] {
  const { free, pro } = limits;
  return [
    { label: "Browse, install and download every public kit", free: "Unlimited", pro: "Unlimited" },
    { label: "New kits from any website", free: `${free.buildsPerHour} an hour`, pro: `${pro.buildsPerHour} an hour` },
    { label: "Pages of one site and tastes", free: `Up to ${free.tasteSites} sites`, pro: `Up to ${pro.tasteSites} sites` },
    { label: "Private tastes and multi-page kits", free: free.privateCombined, pro: pro.privateCombined },
    { label: "Browser extension: pages behind your login", free: `${free.capturesPerHour} pages an hour`, pro: `${pro.capturesPerHour} pages an hour` },
    { label: "Private kits from the extension", free: true, pro: true },
    { label: "Save kits, publish when ready", free: true, pro: true },
    { label: "Support an independent tool", free: false, pro: true },
  ];
}
