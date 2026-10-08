import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/constants/constants";
import { faqPage } from "@/lib/seo/schema";

// A plain definition and the questions people actually ask, in words search
// and answer engines can quote. Also marked up as an FAQ.
export const HOME_QUESTIONS = [
  {
    q: "How do I make Claude Code follow a design system?",
    a: "Install a Livery kit as a Claude Code skill: paste the install prompt from any kit page and Claude downloads the kit, checks its hash and saves it under .claude/skills. When you ask it to apply the kit, it audits your project, reports the gap and changes one area at a time after you approve.",
  },
  {
    q: "What does a design kit contain?",
    a: "A SKILL.md with the steps your agent follows, tokens.json with colours, type, spacing, radii and shadows, rules.md with the design's principles and what to never do, plus component, layout, motion and voice notes and reference frames of the site with its content removed.",
  },
  {
    q: "Does it work with Cursor, Codex and Windsurf?",
    a: "Yes. A kit is plain Markdown and JSON. Unzip it into your project and point the agent at SKILL.md; Cursor, Codex, Windsurf and claude.ai follow the same steps.",
  },
  {
    q: "Is it allowed to use another site's design?",
    a: "Livery measures style (values like colours, spacing and type sizes) and never copies logos, images, fonts or text. Site owners can opt in to share more, or opt out and have kits withdrawn.",
  },
];

export function WhatIsLivery() {
  return (
    <section aria-labelledby="what-is-livery" className="border-t border-border px-4 py-16 sm:px-6 sm:py-20">
      <JsonLd data={faqPage(HOME_QUESTIONS)} />
      <div className="mx-auto grid max-w-[80rem] grid-cols-1 gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20">
        <div>
          <p className="label-micro">In one sentence</p>
          <h2 id="what-is-livery" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            What Is Livery?
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">{SITE.definition}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
            Read <Link href="/how-it-works" className="font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent">how it works</Link>, browse the{" "}
            <Link href="/explore" className="font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent">library</Link>, or the{" "}
            <Link href="/guides" className="font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent">guides</Link>.
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          {HOME_QUESTIONS.map(({ q, a }) => (
            <div key={q}>
              <dt className="text-[15px] font-semibold tracking-tight">{q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-fg-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
