import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Takedown Policy",
  description: "How site owners can have Livery kits of their site withdrawn.",
  path: "/legal/takedown",
  kicker: "Legal",
});

export default function TakedownPolicyPage() {
  return (
    <Prose kicker="Legal" title="Takedown policy" updated="October 6, 2026">
      <p>If you own a site and don&apos;t want Livery to build kits from it, we&apos;ll stop, and withdraw what exists.</p>
      <h2>Fastest: publish an opt-out file</h2>
      <p>Put <code>{`{ "version": 1, "allow": { "levels": [] }, ... }`}</code> at <code>/.well-known/livery.json</code>. The <Link href="/owners#opt-in">generator</Link> writes it for you. New builds stop at once and existing versions are withdrawn within a day.</p>
      <h2>Or ask us</h2>
      <p>Use the <Link href="/owners#takedown">takedown form</Link>. We reply within two working days.</p>
      <h2>What withdrawal means</h2>
      <ul>
        <li>The version&apos;s files are deleted and its links answer 410 Gone.</li>
        <li>It disappears from the library and search.</li>
        <li>Your domain is blocked from future builds.</li>
      </ul>
    </Prose>
  );
}
