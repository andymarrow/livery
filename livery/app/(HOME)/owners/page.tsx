import type { Metadata } from "next";
import { FileCode, FileRemove, WebValidation } from "@/components/icons";
import { OptInGenerator } from "./_components/OptInGenerator";
import { SiteChecker } from "./_components/SiteChecker";
import { TakedownForm } from "./_components/TakedownForm";

export const metadata: Metadata = {
  title: "For site owners",
  description: "Opt in for richer kits, check what Livery sees, or opt out and have kits withdrawn.",
};

function Block({ id, icon, kicker, title, body, children, wide = false }: { id: string; icon: React.ReactNode; kicker: string; title: string; body: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-16 sm:py-20">
      <div className={wide ? "grid gap-10" : "grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16"}>
        <div className={wide ? "max-w-xl" : undefined}>
          <span className="flex size-10 items-center justify-center rounded-[14px] bg-accent-soft text-accent-soft-fg [&_svg]:size-5">{icon}</span>
          <p className="label-micro mt-5">{kicker}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{body}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export default function OwnersPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
      <p className="label-micro">For site owners</p>
      <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl">
        Your site, <span className="text-fg-subtle">your call.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted text-pretty">
        Without a word from you, Livery only describes your design: values and style, never your logo, images, fonts or words. One small file lets you share more, or nothing at all.
      </p>

      <div className="mt-14">
        <Block wide id="opt-in" icon={<FileCode />} kicker="Opt in" title="Share more of your design" body="Grant levels 4 to 6: your own design rules, assets you're happy to share, and real copy in voice examples. Publish the file and new kits pick it up within a day.">
          <OptInGenerator />
        </Block>
        <Block id="check" icon={<WebValidation />} kicker="Check" title="See what Livery sees" body="Whether LiveryBot can reach your site, whether robots.txt or bot protection stops it, and whether your opt-in file is valid.">
          <SiteChecker />
        </Block>
        <Block id="takedown" icon={<FileRemove />} kicker="Opt out" title="Withdraw your kits" body="The fastest way is an opt-out file. You can also ask us directly; published versions are withdrawn and their links answer 410 Gone.">
          <TakedownForm />
        </Block>
      </div>
    </div>
  );
}
