import { Fingerprint, HandPalm, LockKey, ShieldCheck } from "@phosphor-icons/react/ssr";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

const ITEMS = [
  {
    Icon: ShieldCheck,
    title: "Never works around protection",
    body: "LiveryBot says who it is and respects robots.txt. When a site blocks it, Livery stops and says so.",
  },
  {
    Icon: LockKey,
    title: "No login, payment or bank pages",
    body: "Sign-in, checkout and banking pages are refused outright, so a kit can never become a look-alike.",
  },
  {
    Icon: Fingerprint,
    title: "Permanent, verifiable versions",
    body: "A published version never changes. Your agent checks its sha256 before installing anything.",
  },
  {
    Icon: HandPalm,
    title: "Owners stay in charge",
    body: "Site owners can opt in for richer kits, or opt out and have their kits withdrawn, with one file.",
  },
];

export function Guardrails() {
  return (
    <section className="border-t border-border px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading kicker="Guardrails" title="Built to be trusted," muted="by you and by the sites you love." />
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-[22px] border border-border bg-border sm:grid-cols-2">
          {ITEMS.map(({ Icon, title, body }, index) => (
            <Reveal key={title} delay={index * 60} className="bg-surface p-6 sm:p-8">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-fg">
                <Icon weight="duotone" className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
