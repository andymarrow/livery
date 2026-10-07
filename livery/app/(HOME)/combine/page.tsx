import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { CombineClient } from "./_components/CombineClient";

export const metadata: Metadata = {
  title: "Combine links into one kit",
  description: "Build one design kit from several pages of a site, or from the sites one person picked: their taste, measured.",
};

export default async function CombinePage({ searchParams }: PageProps<"/combine">) {
  const { kind } = await searchParams;
  return (
    <>
      <PageIntro
        kicker="Combine"
        title="One Kit From"
        muted="Several Links"
        lead="Give your agent more to go on. Paste a few pages of one site for a fuller kit, or the sites one designer made to capture their taste."
      />
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <CombineClient initialKind={kind === "taste" ? "taste" : "site"} />
      </section>
    </>
  );
}
