import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { CreateScene } from "@/components/iso/scenes";
import { CreateClient, type CreateKind } from "./_components/CreateClient";

export const metadata: Metadata = {
  title: "Create a kit",
  description: "Make a design kit from one website, from several pages of one site, or from the sites one person picked: their taste.",
};

const KINDS: CreateKind[] = ["single", "site", "taste", "login"];

export default async function CreatePage({ searchParams }: PageProps<"/create">) {
  const { kind } = await searchParams;
  return (
    <>
      <PageIntro
        art={<CreateScene />}
        kicker="Create"
        title="Make a Kit From"
        muted="Anything You Admire"
        lead="One website for a quick kit, several pages of a site for more context, the sites one designer made to capture their taste, or pages behind your login."
      />
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <CreateClient initialKind={KINDS.includes(kind as CreateKind) ? (kind as CreateKind) : "single"} />
      </section>
    </>
  );
}
