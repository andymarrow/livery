import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { HowItWorks } from "../_components/HowItWorks";
import { OpenAKit } from "../_components/OpenAKit";
import { StyleNeverAssets } from "../_components/StyleNeverAssets";
import { TheFlow } from "../_components/TheFlow";

export const metadata: Metadata = {
  title: "How it works",
  description: "From a link to a design kit to your codebase: what Livery measures, what a kit contains, and how your agent applies it.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro
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
