import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { CreateScene } from "@/components/iso/scenes";
import { getBillingSettings } from "@/lib/billing/settings";
import { planOf } from "@/lib/billing/subscription";
import { currentUser } from "@/utils/supabase/server";
import { CreateClient, type CreateKind } from "./_components/CreateClient";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbs } from "@/lib/seo/schema";

export const metadata: Metadata = pageMetadata({
  title: "Create a Design Kit From Any Website",
  description: "Paste a link to turn a website, several pages of one site, or a designer's favourite sites into a design kit your coding agent can install. Free.",
  path: "/create",
  kicker: "Create",
});

const KINDS: CreateKind[] = ["single", "site", "taste", "login"];

export default async function CreatePage({ searchParams }: PageProps<"/create">) {
  const { kind } = await searchParams;
  const [plan, billing] = await Promise.all([planOf((await currentUser().catch(() => null))?.id), getBillingSettings()]);
  return (
    <>
      <JsonLd data={[breadcrumbs([{ name: "Create a kit", path: "/create" }])]} />
      <PageIntro
        art={<CreateScene />}
        kicker="Create"
        title="Make a Kit From"
        muted="Anything You Admire"
        lead="One website for a quick kit, several pages of a site for more context, the sites one designer made to capture their taste, or pages behind your login."
      />
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <CreateClient initialKind={KINDS.includes(kind as CreateKind) ? (kind as CreateKind) : "single"} plan={plan} tasteMax={billing.limits[plan].tasteSites} payments={billing.enabled} privateAllowed={billing.limits[plan].privateCombined} proSites={billing.limits.pro.tasteSites} />
      </section>
    </>
  );
}
