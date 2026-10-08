import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { HowItWorksScene } from "@/components/iso/scenes";
import { HowItWorks } from "../_components/HowItWorks";
import { OpenAKit } from "../_components/OpenAKit";
import { StyleNeverAssets } from "../_components/StyleNeverAssets";
import { TheFlow } from "../_components/TheFlow";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbs } from "@/lib/seo/schema";

export const metadata: Metadata = pageMetadata({
  title: "How Livery Works: From a Website to Your Codebase",
  description: "Livery measures a site's design, writes it down as a kit with the reasons attached, and your AI agent applies it one area at a time, only after asking you.",
  path: "/how-it-works",
  kicker: "How it works",
});

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd data={[breadcrumbs([{ name: "How it works", path: "/how-it-works" }]), {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to give your AI coding agent a website's design system",
            description: "Turn any public website into a design kit and apply it to your project with Claude Code, Cursor or Codex.",
            totalTime: "PT3M",
            step: [
              { "@type": "HowToStep", position: 1, name: "Paste a link", text: "Put livery.site/ in front of any public website, or paste it on livery.site. Livery renders it at three screen sizes and measures its colours, type, spacing, icons, components and motion." },
              { "@type": "HowToStep", position: 2, name: "Install the kit", text: "Copy the install prompt from the kit page into your agent. It downloads the kit, verifies its sha256 hash and saves it as a skill." },
              { "@type": "HowToStep", position: 3, name: "Your agent asks, then applies", text: "Ask your agent to apply the kit. It audits your project, rates the gap for each area, asks what to change and commits each approved area separately." },
            ],
          }]} />
      <PageIntro
        art={<HowItWorksScene />}
        kicker="How it works"
        title="Measured, Written Down,"
        muted="and Applied With You"
        lead="Livery measures a site's design, writes it down as a kit with the reasons attached, and your agent applies it one area at a time, only after asking you."
      />
      <HowItWorks />
      <TheFlow />
      <OpenAKit />
      <StyleNeverAssets />
    </>
  );
}
