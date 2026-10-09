import Link from "next/link";
import { ArrowRight, Check } from "@/components/icons";
import type { Limits } from "@/lib/billing/plans";
import type { Subscription } from "@/lib/billing/subscription";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// The account's plan: Free with a gentle pointer to Pro, or Pro with its
// renewal (or end) date and the way to manage it in Polar's portal.
export function PlanCard({ subscription, notice, limits, payments }: { subscription: Subscription; notice: string | null; limits: Limits; payments: boolean }) {
  const LIMITS = limits;
  const pro = subscription.plan === "pro";
  return (
    <section id="plan" className="mt-12 scroll-mt-24">
      {notice && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-[14px] bg-accent-soft px-4 py-3 text-sm text-accent-soft-fg">
          <Check className="size-4" /> {notice}
        </p>
      )}
      <div className={`flex flex-col gap-5 rounded-[18px] border bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:p-6 ${pro ? "border-accent" : "border-border"}`}>
        <div className="min-w-0 flex-1">
          <p className="label-micro">{pro ? (subscription.source === "admin" ? "Livery Pro · given by Livery" : "Livery Pro") : "Free plan"}</p>
          <p className="mt-1.5 text-[15px] font-semibold tracking-tight">
            {pro
              ? subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd
                ? `Pro until ${day(subscription.currentPeriodEnd)}, then Free.`
                : subscription.currentPeriodEnd
                  ? `Renews ${subscription.interval === "year" ? "yearly" : "monthly"} on ${day(subscription.currentPeriodEnd)}.`
                  : "Active."
              : "Everything in the library, new kits and the extension, free."}
          </p>
          <p className="mt-1 text-[13px] text-fg-muted">
            {pro
              ? `${LIMITS.pro.buildsPerHour} builds an hour, tastes of up to ${LIMITS.pro.tasteSites} sites, private tastes and multi-page kits, ${LIMITS.pro.capturesPerHour} extension pages an hour. Thank you for supporting Livery.`
              : `${LIMITS.free.buildsPerHour} builds an hour, tastes of up to ${LIMITS.free.tasteSites} sites, ${LIMITS.free.capturesPerHour} extension pages an hour.`}
          </p>
        </div>
        {pro && subscription.source === "admin" ? null : pro ? (
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- redirects to Polar's portal
          <a href="/api/billing/portal" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] font-medium transition-colors hover:border-border-strong">
            Manage billing <ArrowRight className="size-3.5" />
          </a>
        ) : !payments ? null : (
          <Link href="/pricing" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-fg">
            Need more? See Pro <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
    </section>
  );
}
