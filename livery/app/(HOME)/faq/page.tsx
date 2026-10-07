import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { Faq } from "../_components/Faq";
import { Guardrails } from "../_components/Guardrails";

export const metadata: Metadata = {
  title: "FAQ and guardrails",
  description: "What Livery reads, what it refuses, and the short answers to common questions.",
};

export default function FaqPage() {
  return (
    <>
      <PageIntro kicker="FAQ" title="Built to Be Trusted" muted="and the Short Answers" lead="What Livery reads, what it never does, and what happens when a site says no." />
      <Guardrails />
      <Faq />
    </>
  );
}
