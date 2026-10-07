import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "About", description: "Why Livery exists and how it thinks about design." };

export default function AboutPage() {
  return (
    <Prose kicker="About" title="Design Is a Set of Decisions">
      <p>Coding agents can build almost anything now, and much of it looks the same. Not because people lack taste, but because taste is hard to hand over. You can point at a site you love, but an agent can&apos;t see what makes it work.</p>
      <p>Livery reads the decisions behind a design (one accent, never a shadow, type that tightens as it grows) and writes them down as a kit your agent can follow, with the reasons attached. Then it asks you before it changes anything.</p>
      <h2>What We Believe</h2>
      <ul>
        <li><strong>Reasons over values.</strong> A palette is easy to copy. Knowing when not to use it is the design.</li>
        <li><strong>Style, never assets.</strong> We describe how a site feels. We never copy what belongs to its owner.</li>
        <li><strong>Your project, your rules.</strong> Kits audit first, ask second and commit one area at a time.</li>
        <li><strong>Owners decide.</strong> Sites can share more, or opt out, with one file.</li>
      </ul>
      <p>Ready? <Link href="/#get-a-kit">Paste a site you love</Link>.</p>
    </Prose>
  );
}
