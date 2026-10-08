import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PageIntro } from "@/components/PageIntro";
import { ArrowRight } from "@/components/icons";
import { HowItWorksScene } from "@/components/iso/scenes";
import { SITE } from "@/constants/constants";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbs } from "@/lib/seo/schema";
import { GUIDES } from "@/lib/seo/guides";

export const metadata: Metadata = pageMetadata({
  title: "Guides: Design Systems for Claude Code, Cursor and AI Agents",
  description: "Practical guides to making AI-built apps look designed: design systems for Claude Code, Cursor rules for UI, design tokens for agents, and style versus assets.",
  path: "/guides",
  kicker: "Guides",
});

export default function GuidesPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbs([{ name: "Guides", path: "/guides" }]),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Livery guides",
            url: `${SITE.url}/guides`,
            hasPart: GUIDES.map((g) => ({ "@type": "TechArticle", headline: g.title, url: `${SITE.url}/guides/${g.slug}` })),
          },
        ]}
      />
      <PageIntro
        art={<HowItWorksScene />}
        kicker="Guides"
        title="Make AI-Built Apps"
        muted="Look Designed"
        lead="How to hand a coding agent a real design: what to give it, where it goes in Claude Code and Cursor, and how to borrow a site's style without copying it."
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <ul className="mx-auto grid max-w-[80rem] grid-cols-1 gap-4 md:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="group flex h-full flex-col rounded-[18px] border border-border bg-surface p-6 shadow-card transition-colors hover:border-border-strong sm:p-7">
                <span className="label-micro">{g.kicker} · {g.minutes} min</span>
                <span className="mt-3 text-xl font-semibold tracking-tight text-balance">{g.title}</span>
                <span className="mt-2 text-sm leading-relaxed text-fg-muted">{g.description}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[13px] font-medium text-accent-ink">
                  Read the guide <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
