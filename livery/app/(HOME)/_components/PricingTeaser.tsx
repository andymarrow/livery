import Link from "next/link";
import { ArrowUpRight, Check } from "@/components/icons";
import { money } from "@/lib/billing/plans";
import { getBillingSettings } from "@/lib/billing/settings";

// The plans in one glance on the home page: what's free (nearly everything)
// and what Pro adds, with the real limits from the admin's billing settings.
export async function PricingTeaser() {
  const { enabled, limits, prices } = await getBillingSettings();
  const free = [
    "Every kit in the library: browse, install, download",
    `New kits from any website, ${limits.free.buildsPerHour} an hour`,
    `Tastes of up to ${limits.free.tasteSites} sites`,
    `The browser extension, ${limits.free.capturesPerHour} pages an hour`,
  ];
  const pro = [
    `${limits.pro.buildsPerHour} new kits an hour`,
    `Tastes and multi-page kits of up to ${limits.pro.tasteSites} sites`,
    "Private tastes and multi-page kits",
    `${limits.pro.capturesPerHour} extension pages an hour`,
  ];
  return (
    <section aria-labelledby="pricing-teaser" className="border-t border-border px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-[80rem] grid-cols-1 gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20">
        <div>
          <p className="label-micro">Pricing</p>
          <h2 id="pricing-teaser" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Free for Almost Everything.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
            {enabled
              ? "No card, no trial clock. Pay only if you build a lot, want bigger or private tastes, or measure many pages behind your login."
              : "Everything is free right now. Pro is coming soon, for people who build a lot; the free plan stays as it is."}
          </p>
          <Link href="/pricing" className="group mt-6 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium transition-colors hover:border-border-strong">
            See pricing
            <ArrowUpRight className="size-3.5 text-fg-subtle transition-transform duration-300 ease-out-soft group-hover:rotate-45" strokeWidth={2.25} />
          </Link>
        </div>
        <div className="grid grid-cols-1 overflow-hidden rounded-[18px] border border-border bg-surface shadow-card md:grid-cols-2">
          <div className="p-6 sm:p-7">
            <p className="label-micro">Free</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight">$0</span>
              <span className="text-sm text-fg-muted">forever</span>
            </p>
            <ul className="mt-5 space-y-2.5">
              {free.map((line) => (
                <li key={line} className="flex gap-2.5 text-[13.5px] leading-snug">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-border bg-surface-2/40 p-6 sm:p-7 md:border-l md:border-t-0">
            <p className="label-micro flex items-center gap-2 text-accent-ink">
              Pro
              {!enabled && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] text-accent-soft-fg">Coming soon</span>}
            </p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight">{money(prices.month)}</span>
              <span className="text-sm text-fg-muted">a month, or {money(prices.year)} a year</span>
            </p>
            <ul className="mt-5 space-y-2.5">
              {pro.map((line) => (
                <li key={line} className="flex gap-2.5 text-[13.5px] leading-snug">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
