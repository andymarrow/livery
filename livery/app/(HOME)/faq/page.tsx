import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { FaqScene } from "@/components/iso/scenes";
import { Faq } from "../_components/Faq";
import { Guardrails } from "../_components/Guardrails";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbs, faqPage } from "@/lib/seo/schema";
import { QUESTIONS } from "../_components/Faq";

export const metadata: Metadata = pageMetadata({
  title: "Livery FAQ: What It Measures and What It Never Copies",
  description: "Short answers about Livery: which coding agents it supports, what it measures, why it never copies logos, images, fonts or text, and whether it's free.",
  path: "/faq",
  kicker: "FAQ",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={[faqPage(QUESTIONS), breadcrumbs([{ name: "FAQ", path: "/faq" }])]} />
      <PageIntro art={<FaqScene />} kicker="FAQ" title="Built to Be Trusted" muted="and the Short Answers" lead="What Livery reads, what it never does, and what happens when a site says no." />
      <Guardrails />
      <Faq />
    </>
  );
}
