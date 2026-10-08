import type { Metadata } from "next";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <Prose kicker="Legal" title="Privacy" updated="October 7, 2026">
      <p>Building public kits never needs an account. Livery collects as little as it can, and never sells data.</p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Kits.</strong> The addresses people ask for and the kits built from them are public, in the library. Kits contain measurements of a design (colours, type, spacing, shapes, motion), never a site&apos;s text, images or code.</li>
        <li><strong>Counts.</strong> Views, likes and downloads of each kit. To count each person once without accounts, we keep a random id in a first-party cookie and a one-way hash of your IP address and browser name. Raw IP addresses are never stored.</li>
        <li><strong>Rate limits.</strong> A one-way hash of your IP address and a counter, kept for a day.</li>
        <li><strong>Takedown requests.</strong> The email address and message you send, kept to handle the request.</li>
        <li><strong>Your theme choice and taste collection.</strong> Kept in your browser only.</li>
      </ul>

      <h2 id="accounts">If you create an account</h2>
      <ul>
        <li><strong>Your account.</strong> Your email address, name and, if you sign in with Google or GitHub, the profile picture they share. Passwords are stored by our authentication provider as salted hashes; we never see them.</li>
        <li><strong>Your kits and saved kits.</strong> Kits you build while signed in are linked to you. Private kits are visible only to you until you publish them.</li>
        <li><strong>Email.</strong> We send only account emails (confirming your address, resetting your password).</li>
        <li><strong>Deleting it.</strong> Use <strong>Delete account</strong> at the bottom of your account page. It removes your account, your private kits and the pages you measured for them, straight away. Kits you published stay in the library, no longer linked to you. If you can&apos;t sign in, email privacy@livery.site from your account&apos;s address.</li>
      </ul>

      <h2 id="extension">The Livery browser extension</h2>
      <p>The extension lets you add pages you can only see when signed in (for example your own app&apos;s dashboard) to your kits.</p>
      <ul>
        <li><strong>When it runs.</strong> Only on the tab you choose, only after you click its icon and press Measure. It has no access to any other tab or site, runs nothing in the background, and keeps no browsing history.</li>
        <li><strong>What it reads.</strong> The page&apos;s design: colours, fonts, sizes, spacing, corner shapes, shadows, layout, its animations (timings and keyframes, with any text in them removed) and small craft details such as blur or sticky elements, and the names and versions of the libraries the page is built with (for example React or Three.js), read from the page&apos;s code. It reads nothing else from the page&apos;s scripts. The page&apos;s copy is turned into a few numbers inside your browser (average sentence length, how often headings use Title Case, whether the text says &ldquo;you&rdquo;), and the text itself is discarded there.</li>
        <li><strong>What it sends.</strong> Those measurements and one picture of the page with all text replaced by bars and all images replaced by flat blocks, only after you have seen them and pressed Send. It never sends text, images, form contents, cookies, passwords or sign-in details.</li>
        <li><strong>Where it goes.</strong> To your Livery account, as a private kit only you can see, until you choose to publish it.</li>
        <li><strong>Connecting.</strong> The extension stores one token in your browser to act for your account. You can disconnect it from the extension or from My kits at any time.</li>
      </ul>
      <p>Data the extension collects is used only to build your kits. It is not sold, not used for advertising, not shared with third parties beyond the processors below, and not used to determine creditworthiness or for lending.</p>

      <h2>What we don&apos;t do</h2>
      <p>No advertising, no tracking pixels, no selling of data. Pages that LiveryBot renders load without their analytics and ad scripts.</p>

      <h2>Processors</h2>
      <p>Livery runs on Vercel (hosting), Supabase (database, storage and authentication), Browserless (the browser that reads public sites) and Resend (account emails). Google and GitHub are used only if you choose to sign in with them. Kits are written from measurements on our own servers; no AI provider receives site data.</p>
    </Prose>
  );
}
