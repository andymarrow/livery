import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { PageIntro } from "@/components/PageIntro";
import { BotScene } from "@/components/iso/scenes";
import { BOT } from "@/constants/constants";
import { SceneCard, SceneSection } from "../_components/SceneCard";
import { AskedScene, KeptScene, LoginScene, NoAssetsScene, OnceScene, RulesScene, SizesScene, StopScene } from "./_components/BotScenes";

export const metadata: Metadata = { title: "LiveryBot", description: "What LiveryBot is, what it reads, and how to allow or block it." };

const VISIT = [
  { title: "Someone Asks", body: "LiveryBot visits a public page only when someone asks Livery for a kit of it. It never crawls on its own.", scene: <AskedScene /> },
  { title: "Your Rules First", body: "It reads robots.txt and your livery.json before anything else, and follows rules addressed to it, or to *.", scene: <RulesScene /> },
  { title: "Three Screen Sizes", body: "It renders the page at desktop, tablet and phone widths, the way a visitor would see it.", scene: <SizesScene /> },
  { title: "Measurements, Kept", body: "Colours, type, spacing, radii, icons and motion are kept as numbers. The page itself isn't.", scene: <KeptScene /> },
];

const NEVER = [
  { title: "Never Gets Around a Block", body: "No CAPTCHA solving, no dodging bot protection or rate limits. When blocked, it stops.", scene: <StopScene /> },
  { title: "Never Signs In", body: "Login, checkout, account and banking pages are never read; banking, payment and identity sites are refused.", scene: <LoginScene /> },
  { title: "Never Keeps Your Assets", body: "No images, logos, fonts, stylesheets or text are stored. Screenshots have images as flat blocks, text as bars.", scene: <NoAssetsScene /> },
  { title: "Never Visits Twice a Day", body: "At most one visit per page per day; everyone else gets the cached kit.", scene: <OnceScene /> },
];

function Snippet({ label, code }: { label: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-mono text-[12px] text-fg-subtle">{label}</span>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-[1.7] text-fg">{code}</pre>
    </div>
  );
}

export default function BotPage() {
  return (
    <>
      <PageIntro art={<BotScene />} kicker="LiveryBot" title="The Polite" muted="Design Crawler" lead="LiveryBot visits a public page when someone asks for a design kit of it, measures the design, and leaves. Here's exactly what one visit looks like." />
      <SceneSection kicker="One visit" title="Asked For, Checked," muted="Measured, Gone" lead="Every visit follows the same four steps, in this order.">
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VISIT.map((step, index) => (
            <SceneCard key={step.title} index={index} title={step.title} body={step.body} delay={index * 60}>
              {step.scene}
            </SceneCard>
          ))}
        </ol>
      </SceneSection>
      <SceneSection kicker="What it never does" title="Four Lines" muted="It Doesn't Cross">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NEVER.map((item, index) => (
            <SceneCard key={item.title} title={item.title} body={item.body} delay={index * 60}>
              {item.scene}
            </SceneCard>
          ))}
        </ul>
      </SceneSection>
      <SceneSection kicker="Recognise, block or allow" title="Your Site," muted="Your Call">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Recognise It</h3>
            <p className="mb-4 mt-2 text-sm leading-relaxed text-fg-muted">Its rendering browser carries the same token in its user agent.</p>
            <Snippet label="User agent" code={BOT.userAgent} />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Block It</h3>
            <p className="mb-4 mt-2 text-sm leading-relaxed text-fg-muted">Add this to robots.txt. Kits already made can be <Link href="/owners#takedown" className="font-medium text-accent-ink underline-offset-4 hover:underline">withdrawn</Link>.</p>
            <Snippet label="robots.txt" code={"User-agent: LiveryBot\nDisallow: /"} />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Allow It</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              If your bot protection blocks automated browsers, add an exception for <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] text-fg">LiveryBot</code>. Then{" "}
              <Link href="/owners#check" className="font-medium text-accent-ink underline-offset-4 hover:underline">check your site</Link> to confirm Livery can read it, and consider an{" "}
              <Link href="/owners#opt-in" className="font-medium text-accent-ink underline-offset-4 hover:underline">opt-in file</Link> to share your own design rules.
            </p>
          </div>
        </div>
      </SceneSection>
    </>
  );
}
