import type { Metadata } from "next";
import Link from "next/link";
import { ExtensionSteps } from "@/components/ExtensionSteps";
import { PageIntro } from "@/components/PageIntro";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X } from "@/components/icons";

export const metadata: Metadata = {
  title: "Browser extension",
  description: "Add pages behind your login, like your app's dashboard or settings, to a private Livery kit.",
};

const SENT = [
  "Measurements of the design: colours, fonts, spacing, corners, motion and layout",
  "One picture of the page with every piece of text and every image removed",
  "The page's address, so the kit can name it",
  "A few numbers about the writing (sentence length, casing), worked out in your browser",
];

const NEVER = [
  "The page's text, images or form contents",
  "Passwords, cookies or anything you've typed",
  "Other tabs, your history, or pages you didn't choose",
  "Anything at all before you've seen it and pressed Send",
];

export default function ExtensionPage() {
  return (
    <>
      <PageIntro
        kicker="Browser extension"
        title="Pages Behind a Login"
        muted="Measured in Your Browser"
        lead="Livery's own browser only sees public pages. The extension measures the ones you're signed into, like your app's dashboard or settings, and adds them to a kit that stays private until you publish it."
      >
        <Button asChild variant="secondary">
          <Link href="/legal/privacy#extension">
            Privacy details <ArrowRight />
          </Link>
        </Button>
      </PageIntro>
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[80rem]">
          <h2 className="mb-5 text-2xl font-semibold tracking-tight">Three Steps</h2>
          <ExtensionSteps />

          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <List title="What's sent" items={SENT} icon={<Check className="size-3.5 text-accent-ink" />} />
            <List title="Never sent" items={NEVER} icon={<X className="size-3.5 text-fg-subtle" />} />
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              ["Same site only", "A page can join a kit only if it's on the same site. Subdomains count, so app.example.com joins example.com."],
              ["Yours stays yours", "Adding a page to a kit you own makes its next version. Adding to someone else's kit gives you a private copy; theirs never changes."],
              ["Publish when ready", "Kits with measured pages are private. Your account page lists them, with the install prompt and a Publish button."],
            ].map(([title, body]) => (
              <div key={title}>
                <p className="text-[14.5px] font-semibold tracking-tight">{title}</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function List({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card sm:p-7">
      <p className="label-micro">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[14px] leading-relaxed">
            <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border border-border">{icon}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
