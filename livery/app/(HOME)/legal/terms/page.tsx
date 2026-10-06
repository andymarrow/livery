import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <Prose kicker="Legal" title="Terms of use" updated="October 6, 2026">
      <p>Livery turns the design of public websites into kits that coding agents can apply. By using livery.site you agree to these terms.</p>
      <h2>What a kit is</h2>
      <p>A kit contains measured design values (colours, spacing, type sizes, radii, timing), written guidance about how to use them, and content-removed reference screenshots. Kits never contain the source site&apos;s logos, images, illustrations, font files, stylesheets or text, except where the site&apos;s owner has granted it in an opt-in file.</p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Respect licences. Items marked “needs a licence” may only be used if you hold one; use the free alternative otherwise.</li>
        <li>Don&apos;t use Livery to imitate another organisation, its branding or its sign-in or payment flows.</li>
        <li>Don&apos;t try to get around Livery&apos;s rate limits or refusals.</li>
      </ul>
      <h2>Availability</h2>
      <p>Livery is provided as is. Published kit versions are permanent unless withdrawn at a site owner&apos;s request, in which case their files stop being available.</p>
      <h2>Site owners</h2>
      <p>Owners can opt in, opt out or request a takedown at any time. See <Link href="/owners">For site owners</Link> and the <Link href="/legal/takedown">takedown policy</Link>.</p>
    </Prose>
  );
}
