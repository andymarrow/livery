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
      <p>Livery runs on Vercel (hosting), Supabase (database and storage) and Browserless (the browser that reads sites). Kits are written from measurements on our own servers; no AI provider receives site data.</p>
    </Prose>
  );
}
