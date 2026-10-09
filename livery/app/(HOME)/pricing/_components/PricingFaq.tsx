import Link from "next/link";
import { Plus } from "@/components/icons";

// Questions as an accordion: native <details>, so it works without JavaScript
// and the answers stay in the page for search.
export function PricingFaq({ questions }: { questions: { q: string; a: string }[] }) {
  return (
    <section aria-labelledby="pricing-faq" className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-16">
      <div>
        <p className="label-micro">Questions</p>
        <h2 id="pricing-faq" className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">About Paying</h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">The rest of Livery is covered in the <Link href="/faq" className="font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent">FAQ</Link>.</p>
      </div>
      <div className="divide-y divide-border rounded-[20px] border border-border bg-surface shadow-card">
        {questions.map(({ q, a }, i) => (
          <details key={q} className="group px-5 sm:px-6" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium tracking-tight [&::-webkit-details-marker]:hidden">
              {q}
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-fg-subtle transition-[transform,background-color,color,border-color] duration-200 ease-out-soft group-open:rotate-45 group-open:border-accent group-open:bg-accent group-open:text-on-accent">
                <Plus className="size-3.5" strokeWidth={2.25} />
              </span>
            </summary>
            <p className="-mt-1 pb-5 pr-10 text-sm leading-relaxed text-fg-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
