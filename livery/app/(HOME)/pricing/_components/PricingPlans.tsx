"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "@/components/icons";
import { money, monthsFree, type BillingInterval, type Prices } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

// Free and Pro side by side, with a monthly/yearly switch. The button fits
// who's looking: sign in, upgrade, or manage an existing plan.
type Feature = { label: string; free: string | boolean; pro: string | boolean };

export function PricingPlans({ plan, prices, features, payments, proSummary, initialInterval = "month" }: { plan: "visitor" | "free" | "pro"; prices: Prices; features: Feature[]; payments: boolean; proSummary: string; initialInterval?: BillingInterval }) {
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const price = interval === "year" ? prices.year : prices.month;
  const cell = (value: string | boolean) =>
    typeof value === "string" ? (
      <span className="text-[13.5px]">{value}</span>
    ) : value ? (
      <Check className="size-4 text-accent-ink" aria-label="Included" />
    ) : (
      <X className="size-4 text-fg-subtle" aria-label="Not included" />
    );
  return (
    <div>
      <div role="radiogroup" aria-label="Billing period" className="mx-auto flex w-fit gap-0.5 rounded-full border border-border bg-surface p-1">
        {(
          [
            ["month", "Monthly"],
            ["year", monthsFree(prices) ? `Yearly · ${monthsFree(prices)} months free` : "Yearly"],
          ] as [BillingInterval, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={interval === id} onClick={() => setInterval(id)} className={cn("h-9 rounded-full px-4 text-[13px] font-medium transition-colors", interval === id ? "bg-fg text-bg" : "text-fg-muted hover:text-fg")}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="flex flex-col rounded-[18px] border border-border bg-surface p-6 shadow-card sm:p-8">
          <p className="label-micro">Free</p>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-4xl font-bold tracking-tight">$0</span>
            <span className="text-sm text-fg-muted">forever</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">Everything most people need: every kit in the library, new kits from any site, the browser extension and private kits from it.</p>
          <div className="mt-auto pt-6">
            {plan === "visitor" ? (
              <Link href="/sign-up?next=/pricing" className="inline-flex h-10 w-full items-center justify-center rounded-full border border-border text-sm font-medium transition-colors hover:border-border-strong">
                Create a free account
              </Link>
            ) : (
              <span className="inline-flex h-10 w-full items-center justify-center rounded-full border border-border text-sm text-fg-muted">{plan === "free" ? "Your plan" : "Included in Pro"}</span>
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-[18px] border-2 border-accent bg-surface p-6 shadow-card sm:p-8">
          <p className="label-micro flex items-center gap-2 text-accent-ink">
            Livery Pro
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] text-accent-soft-fg">For people who build a lot</span>
          </p>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-4xl font-bold tracking-tight">{money(price)}</span>
            <span className="text-sm text-fg-muted">{interval === "year" ? "a year" : "a month"}</span>
            {interval === "year" && <span className="ml-1 text-[13px] text-fg-subtle">({money(Math.round((prices.year / 12) * 100) / 100)} a month)</span>}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{proSummary} Cancel any time.</p>
          <div className="mt-auto pt-6">
            {/* eslint-disable @next/next/no-html-link-for-pages -- billing routes redirect to Polar: a full page load, not client navigation */}
            {!payments ? (
              <span className="inline-flex h-10 w-full items-center justify-center rounded-full border border-dashed border-accent text-sm font-medium text-accent-ink">{plan === "pro" ? "You have Pro" : "Coming soon"}</span>
            ) : plan === "pro" ? (
              <a href="/api/billing/portal" className="inline-flex h-10 w-full items-center justify-center rounded-full border border-accent text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-soft">
                Manage your plan
              </a>
            ) : (
              <a href={`/api/billing/checkout?interval=${interval}`} className="inline-flex h-10 w-full items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent transition-opacity hover:opacity-90">
                {plan === "visitor" ? "Sign in and upgrade" : "Upgrade to Pro"}
              </a>
            )}
            {/* eslint-enable @next/next/no-html-link-for-pages */}
          </div>
        </section>
      </div>

      <div className="mt-8 overflow-hidden rounded-[18px] border border-border bg-surface shadow-card">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-[12px] text-fg-muted">
              <th className="px-5 py-3 font-medium">What you get</th>
              <th className="w-28 px-3 py-3 font-medium sm:w-40">Free</th>
              <th className="w-28 px-3 py-3 font-medium text-accent-ink sm:w-40">Pro</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.label} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-[14px]">{f.label}</td>
                <td className="px-3 py-3 text-fg-muted">{cell(f.free)}</td>
                <td className="px-3 py-3">{cell(f.pro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
