"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "@/components/icons";
import { money, monthsFree, type BillingInterval, type Limits, type Prices } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

// Free and Pro side by side, with a monthly/yearly switch. The button fits
// who's looking: sign up, upgrade, or manage an existing plan. Every number
// comes from the admin's billing settings.

type Plan = "visitor" | "free" | "pro";

function List({ items, hot }: { items: string[]; hot?: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[14px] leading-snug">
          <span className={cn("mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full", hot ? "bg-accent text-on-accent" : "border border-border-strong text-fg-muted")}>
            <Check className="size-3" strokeWidth={2.5} aria-hidden />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

const button = "inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition-[opacity,background-color,border-color] duration-150";

export function PricingPlans({ plan, prices, limits, payments, initialInterval = "month" }: { plan: Plan; prices: Prices; limits: Limits; payments: boolean; initialInterval?: BillingInterval }) {
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const yearly = interval === "year";
  const saved = monthsFree(prices);
  const perMonth = Math.round((prices.year / 12) * 100) / 100;
  const free = [
    "Every kit in the library: browse, install, download",
    `${limits.free.buildsPerHour} new kits an hour, from any website`,
    `Tastes and multi-page kits of up to ${limits.free.tasteSites} sites`,
    `The browser extension: ${limits.free.capturesPerHour} pages an hour, private kits`,
    "Save kits and publish them when you're ready",
  ];
  const times = limits.free.buildsPerHour > 0 ? Math.round(limits.pro.buildsPerHour / limits.free.buildsPerHour) : 0;
  const pro = [
    times >= 2 ? `${times}× the builds: ${limits.pro.buildsPerHour} new kits an hour` : `${limits.pro.buildsPerHour} new kits an hour`,
    `Tastes and multi-page kits of up to ${limits.pro.tasteSites} sites`,
    ...(limits.pro.privateCombined ? ["Keep tastes and multi-page kits private"] : []),
    `${limits.pro.capturesPerHour} extension pages an hour`,
    "Keeps Livery independent and ad-free",
  ];

  return (
    <div>
      <div className="flex flex-col items-center gap-3">
        <div role="radiogroup" aria-label="Billing period" className="flex gap-0.5 rounded-full border border-border bg-surface p-1 shadow-card">
          {(
            [
              ["month", "Monthly", null],
              ["year", "Yearly", saved ? `${saved} months free` : null],
            ] as [BillingInterval, string, string | null][]
          ).map(([id, label, badge]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={interval === id}
              onClick={() => setInterval(id)}
              className={cn("flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors duration-150", interval === id ? "bg-fg text-bg" : "text-fg-muted hover:text-fg")}
            >
              {label}
              {badge && <span className={cn("rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold", interval === id ? "bg-accent text-on-accent" : "bg-accent-soft text-accent-soft-fg")}>{badge}</span>}
            </button>
          ))}
        </div>
        {!payments && (
          <p role="status" className="flex items-center gap-2 text-[12.5px] text-fg-muted">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-accent" aria-hidden />
            Pro opens soon. Until then, everyone gets the free plan.
          </p>
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <section aria-labelledby="plan-free" className="flex flex-col rounded-[20px] border border-border bg-surface p-6 shadow-card sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 id="plan-free" className="text-lg font-semibold tracking-tight">Free</h2>
            {plan === "free" && <span className="rounded-full border border-border px-2.5 py-0.5 text-[11.5px] text-fg-muted">Your plan</span>}
          </div>
          <p className="mt-1 text-sm text-fg-muted">For trying Livery and most everyday work.</p>
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="text-5xl font-bold tracking-[-0.03em]">$0</span>
            <span className="text-sm text-fg-muted">forever</span>
          </p>
          <p className="mt-1.5 h-5 text-[13px] text-fg-subtle">No card needed.</p>
          <div className="mt-6">
            {plan === "visitor" ? (
              <Link href="/sign-up?next=/create" className={cn(button, "border border-border-strong hover:border-fg")}>
                Start free
              </Link>
            ) : (
              <Link href="/create" className={cn(button, "border border-border-strong hover:border-fg")}>
                Make a kit
              </Link>
            )}
          </div>
          <div className="mt-7 border-t border-border pt-6">
            <List items={free} />
          </div>
        </section>

        <section aria-labelledby="plan-pro" className="relative flex flex-col rounded-[20px] border-2 border-accent bg-surface p-6 shadow-card sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 id="plan-pro" className="text-lg font-semibold tracking-tight text-accent-ink">Livery Pro</h2>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-medium text-accent-soft-fg">{plan === "pro" ? "Your plan" : "For people who build a lot"}</span>
          </div>
          <p className="mt-1 text-sm text-fg-muted">For heavy builders, bigger tastes and private work.</p>
          <p key={interval} className="pr-swap mt-6 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-5xl font-bold tracking-[-0.03em]">{money(yearly ? perMonth : prices.month)}</span>
            <span className="text-sm text-fg-muted">a month</span>
          </p>
          <p key={`${interval}-note`} className="pr-swap mt-1.5 h-5 text-[13px] text-fg-subtle">
            {yearly ? (
              <>
                {money(prices.year)} billed yearly{saved ? <> · <s className="decoration-fg-subtle">{money(Math.round(prices.month * 12 * 100) / 100)}</s></> : null}
              </>
            ) : (
              "Billed monthly. Cancel any time."
            )}
          </p>
          <div className="mt-6">
            {/* eslint-disable @next/next/no-html-link-for-pages -- billing routes redirect to Polar: a full page load, not client navigation */}
            {!payments ? (
              <span className={cn(button, "border border-dashed border-accent font-medium text-accent-ink")}>{plan === "pro" ? "You have Pro" : "Coming soon"}</span>
            ) : plan === "pro" ? (
              <a href="/api/billing/portal" className={cn(button, "border border-accent text-accent-ink hover:bg-accent-soft")}>
                Manage your plan
              </a>
            ) : (
              <a href={`/api/billing/checkout?interval=${interval}`} className={cn(button, "bg-accent text-on-accent hover:opacity-90")}>
                {plan === "visitor" ? "Sign in and get Pro" : "Upgrade to Pro"}
              </a>
            )}
            {/* eslint-enable @next/next/no-html-link-for-pages */}
          </div>
          <div className="mt-7 border-t border-border pt-6">
            <p className="mb-4 text-[12.5px] font-medium text-fg-muted">Everything in Free, plus:</p>
            <List items={pro} hot />
          </div>
        </section>
      </div>
    </div>
  );
}
