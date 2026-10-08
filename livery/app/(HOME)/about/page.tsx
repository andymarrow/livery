import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { AboutScene } from "@/components/iso/scenes";
import { ArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { SceneCard, SceneSection } from "../_components/SceneCard";
import { OwnerScene, ReasonScene, RulesScene, StyleScene } from "./_components/BeliefScenes";

export const metadata: Metadata = { title: "About", description: "Why Livery exists and how it thinks about design." };

const BELIEFS = [
  { title: "Reasons Over Values", body: "A palette is easy to copy. Knowing when not to use it is the design, so every value in a kit carries its why.", scene: <ReasonScene /> },
  { title: "Style, Never Assets", body: "We describe how a site feels. We never copy what belongs to its owner: logos, photos, fonts and words stay theirs.", scene: <StyleScene /> },
  { title: "Your Project, Your Rules", body: "Kits audit first, ask second, and commit one area at a time, so any change can be undone on its own.", scene: <RulesScene /> },
  { title: "Owners Decide", body: "One small file lets a site share more of its design, or opt out entirely. Livery reads it before every visit.", scene: <OwnerScene /> },
];

export default function AboutPage() {
  return (
    <>
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
