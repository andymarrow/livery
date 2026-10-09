import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { PageIntro } from "@/components/PageIntro";
import { SITE } from "@/constants/constants";
import { money } from "@/lib/billing/plans";
import { getBillingSettings } from "@/lib/billing/settings";
import { planOf } from "@/lib/billing/subscription";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbs, faqPage } from "@/lib/seo/schema";
import { currentUser } from "@/utils/supabase/server";
import { PricingScene } from "@/components/iso/scenes";
import { FinalCta } from "../_components/FinalCta";
import { CompareTable } from "./_components/CompareTable";
import { LimitRulers } from "./_components/LimitRulers";
import { PricingFaq } from "./_components/PricingFaq";
import { PricingPlans } from "./_components/PricingPlans";

// Prices and limits come from the admin's billing settings.
export async function generateMetadata(): Promise<Metadata> {
  const billing = await getBillingSettings();
  return pageMetadata({
    title: "Pricing: Free for Almost Everything, Pro When You Need More",
    description: `Livery is free: every design kit in the library, new kits from any site and the browser extension. Livery Pro is ${money(billing.prices.month)} a month for heavy builders.`,
    path: "/pricing",
    kicker: "Pricing",
  });
}

export const dynamic = "force-dynamic";

const questions = (free: number, pro: number) => [
  { q: "What stays free?", a: `Browsing, installing and downloading every public kit, without limits. Building new kits from any website, pages of one site and tastes of up to ${free} sites, the browser extension, private kits from it, saving kits and publishing them. Free is not a trial.` },
  { q: "When would I need Pro?", a: `When you build a lot of new kits in a short time, want tastes or multi-page kits of up to ${pro} sites, want to keep a taste or multi-page kit private, or measure many pages behind your login with the extension.` },
  { q: "Can I cancel?", a: "Any time, from your account page (Manage billing). Pro keeps working until the end of the period you paid for, then your account goes back to Free." },
  { q: "What happens to my private kits if I cancel?", a: "They stay yours and stay private. Without Pro you can't make new private tastes or multi-page kits, and the free limits apply again." },
  { q: "Who handles payment?", a: "Polar (polar.sh), as merchant of record. It runs checkout, sends invoices and handles sales tax and VAT. Livery never sees your card." },
];

export default async function PricingPage({ searchParams }: PageProps<"/pricing">) {
  const params = await searchParams;
  const [plan, billing] = await Promise.all([planOf((await currentUser().catch(() => null))?.id), getBillingSettings()]);
  const QUESTIONS = questions(billing.limits.free.tasteSites, billing.limits.pro.tasteSites);
  const notice = params.billing === "unavailable" ? "Upgrades aren't switched on yet. Everything else works; check back soon." : params.billing === "error" ? "Checkout didn't open. Nothing was charged; please try again." : null;
  return (
    <>
      <JsonLd
        data={[
          breadcrumbs([{ name: "Pricing", path: "/pricing" }]),
          faqPage(QUESTIONS),
          ...(billing.enabled ? [{
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Livery Pro",
            description: "More builds, tastes of up to 12 sites, private tastes and multi-page kits, and more pages from the browser extension.",
            brand: { "@type": "Brand", name: SITE.name },
            offers: [
              { "@type": "Offer", name: "Monthly", price: String(billing.prices.month), priceCurrency: "USD", url: `${SITE.url}/pricing` },
              { "@type": "Offer", name: "Yearly", price: String(billing.prices.year), priceCurrency: "USD", url: `${SITE.url}/pricing` },
            ],
          }] : []),
        ]}
      />
      <PageIntro
        art={<PricingScene />}
        kicker="Pricing"
        title="Free for Almost Everything."
        muted="Pro When You Need More."
        lead="Every kit in the library, new kits from any website and the browser extension are free. Pay only if you build a lot, want bigger or private tastes, or measure many pages behind your login."
      />
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl space-y-16 sm:space-y-20">
          {notice && <p role="status" className="rounded-[14px] border border-border bg-surface px-4 py-3 text-center text-sm text-fg-muted">{notice}</p>}
          <PricingPlans plan={plan} prices={billing.prices} limits={billing.limits} payments={billing.enabled} initialInterval={params.interval === "year" ? "year" : "month"} />
          <LimitRulers limits={billing.limits} />
          <CompareTable limits={billing.limits} />
          <PricingFaq questions={QUESTIONS} />
        </div>
      </section>
      <FinalCta />
    </>
  );
}
