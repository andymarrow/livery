import type { Metadata } from "next";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <Prose kicker="Legal" title="Privacy" updated="October 6, 2026">
      <p>Livery doesn&apos;t need an account, and collects as little as it can.</p>
      <h2>What we store</h2>
      <ul>
        <li><strong>Kits.</strong> The addresses people ask for and the kits built from them are public, in the library.</li>
        <li><strong>Rate limits.</strong> A one-way hash of your IP address and a counter, kept for a day. Raw IP addresses are never stored.</li>
        <li><strong>Takedown requests.</strong> The email address and message you send, kept to handle the request.</li>
        <li><strong>Your theme choice.</strong> Light or dark, kept in your browser only.</li>
      </ul>
      <h2>What we don&apos;t do</h2>
      <p>No advertising, no tracking pixels, no selling of data. Pages that LiveryBot renders load without their analytics and ad scripts.</p>
      <h2>Processors</h2>
      <p>Livery runs on Vercel (hosting) and Supabase (database and storage). Measured design values and content-removed screenshots are sent to Google&apos;s Gemini API to write each kit&apos;s guidance.</p>
    </Prose>
  );
}
