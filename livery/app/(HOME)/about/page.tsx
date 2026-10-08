import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { AboutScene } from "@/components/iso/scenes";
import { ArrowRight, ArrowUpRight, Coffee } from "@/components/icons";
import { CREATOR } from "@/constants/constants";
import { Button } from "@/components/ui/button";
import { SceneCard, SceneSection } from "../_components/SceneCard";
import { OwnerScene, ReasonScene, RulesScene, StyleScene } from "./_components/BeliefScenes";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbs } from "@/lib/seo/schema";

export const metadata: Metadata = pageMetadata({
  title: "About Livery: Design Is a Set of Decisions",
  description: "Why Livery exists: coding agents build fast but look the same. Livery hands them a site's design decisions, with the reasons, and asks before changing anything.",
  path: "/about",
  kicker: "About",
});

const BELIEFS = [
  { title: "Reasons Over Values", body: "A palette is easy to copy. Knowing when not to use it is the design, so every value in a kit carries its why.", scene: <ReasonScene /> },
  { title: "Style, Never Assets", body: "We describe how a site feels. We never copy what belongs to its owner: logos, photos, fonts and words stay theirs.", scene: <StyleScene /> },
  { title: "Your Project, Your Rules", body: "Kits audit first, ask second, and commit one area at a time, so any change can be undone on its own.", scene: <RulesScene /> },
  { title: "Owners Decide", body: "One small file lets a site share more of its design, or opt out entirely. Livery reads it before every visit.", scene: <OwnerScene /> },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={[breadcrumbs([{ name: "About", path: "/about" }])]} />
      <PageIntro
        art={<AboutScene />}
        kicker="About"
        title="Design Is a Set"
        muted="of Decisions"
        lead="Coding agents can build almost anything now, and much of it looks the same. Not because people lack taste, but because taste is hard to hand over. You can point at a site you love, but an agent can't see what makes it work."
      />
      <SceneSection
        kicker="What we believe"
        title="Four Ideas"
        muted="Behind Every Kit"
        lead="Livery reads the decisions behind a design (one accent, never a shadow, type that tightens as it grows) and writes them down with the reasons attached. Then it asks you before it changes anything."
      >
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {BELIEFS.map((belief, index) => (
            <SceneCard key={belief.title} index={index} title={belief.title} body={belief.body} delay={index * 60}>
              {belief.scene}
            </SceneCard>
          ))}
        </ol>
      </SceneSection>
      <SceneSection kicker="Who makes it" title="Built by One Person," muted="in the Open">
        <div className="flex flex-col gap-6 rounded-[18px] border border-border bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <p className="max-w-xl text-[15px] leading-relaxed text-fg-muted">
            Livery is made by <a href={CREATOR.x} target="_blank" rel="noreferrer" className="font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent">{CREATOR.handle}</a>. Questions, ideas or a site Livery couldn&apos;t read? Say hello on X. If Livery saves you time, a coffee keeps it going.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild>
              <a href={CREATOR.support} target="_blank" rel="noreferrer">
                <Coffee /> Buy me a coffee
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href={CREATOR.x} target="_blank" rel="noreferrer">
                Say hello on X <ArrowUpRight />
              </a>
            </Button>
          </div>
        </div>
      </SceneSection>
      <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto flex max-w-[80rem] flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready? <span className="text-fg-subtle">Paste a site you love.</span>
          </h2>
          <Button asChild>
            <Link href="/create">
              Create a kit <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
