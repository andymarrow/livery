import { CopyButton } from "@/components/CopyButton";
import { SITE } from "@/constants/constants";
import { kitHome } from "@/lib/kit/urls";

// "Design kit on Livery": a badge for the site's own pages or a README,
// linking back to this kit.
export function KitBadge({ slug, title }: { slug: string; title: string }) {
  const href = `${SITE.url}${kitHome(slug)}`;
  const img = `${SITE.url}${kitHome(slug)}/badge.svg`;
  const html = `<a href="${href}"><img src="${img}" alt="${title} design kit on Livery" width="168" height="28"></a>`;
  const md = `[![${title} design kit on Livery](${img})](${href})`;
  return (
    <details className="group mt-14 rounded-[18px] border border-border bg-surface shadow-card">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- our own static SVG badge */}
        <img src={`${kitHome(slug)}/badge.svg`} alt="" width={168} height={28} className="shrink-0 dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element -- our own static SVG badge */}
        <img src={`${kitHome(slug)}/badge.svg?theme=dark`} alt="" width={168} height={28} className="hidden shrink-0 dark:block" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold tracking-tight">Show the badge</span>
          <span className="block text-[13px] text-fg-muted">Own {title}, or built with this kit? Link to it from your site or README.</span>
        </span>
        <span className="text-[13px] text-fg-subtle transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="grid grid-cols-1 gap-3 border-t border-border p-5 sm:p-6 lg:grid-cols-2">
        {[
          ["HTML", html],
          ["Markdown", md],
        ].map(([label, code]) => (
          <div key={label} className="min-w-0 overflow-hidden rounded-[12px] border border-border bg-bg">
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
              <span className="font-mono text-[11px] text-fg-subtle">{label}</span>
              <CopyButton value={code} />
            </div>
            <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-fg-muted">{code}</pre>
          </div>
        ))}
      </div>
    </details>
  );
}
