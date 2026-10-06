import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { BOT } from "@/constants/constants";

export const metadata: Metadata = { title: "LiveryBot", description: "What LiveryBot is, what it reads, and how to allow or block it." };

export default function BotPage() {
  return (
    <Prose kicker="LiveryBot" title="The crawler that reads designs, politely.">
      <p>LiveryBot visits a public page when someone asks Livery for a design kit of it. It renders the page at three screen sizes and measures the design: colours, type, spacing, radii, icons and motion.</p>
      <h2>How to recognise it</h2>
      <pre><code>{BOT.userAgent}</code></pre>
      <p>Its rendering browser includes the same token in its user agent.</p>
      <h2>What it never does</h2>
      <ul>
        <li>It never tries to get around bot protection, CAPTCHAs or rate limits. When blocked, it stops and tells the person who asked.</li>
        <li>It never reads login, checkout, account or banking pages, and refuses banking, payment and identity sites entirely.</li>
        <li>It never stores your images, logos, fonts, stylesheets or text. Screenshots have images replaced by flat blocks and text by bars.</li>
        <li>It only makes one visit per page per day at most; results are cached.</li>
      </ul>
      <h2>Block it</h2>
      <pre><code>{`User-agent: LiveryBot\nDisallow: /`}</code></pre>
      <p>LiveryBot follows robots.txt rules addressed to it, and the rules for <code>*</code> when there are none.</p>
      <h2>Allow it</h2>
      <p>If your bot protection blocks automated browsers, add an exception for the <code>LiveryBot</code> user agent. Then <Link href="/owners#check">check your site</Link> to confirm Livery can read it, and consider an <Link href="/owners#opt-in">opt-in file</Link> to share your own design rules.</p>
    </Prose>
  );
}
