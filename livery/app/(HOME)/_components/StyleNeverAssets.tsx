import { LicenceBadge, type Licence } from "@/components/LicenceBadge";

const ITEMS: { licence: Licence; title: string; body: string; examples: string }[] = [
  {
    licence: "free",
    title: "Reused as is",
    body: "Values and open-source pieces your agent can install straight from the source.",
    examples: "Colours, spacing, radii, easing · Lucide, Phosphor · Google Fonts",
  },
  {
    licence: "licence_required",
    title: "Needs your licence",
    body: "Paid fonts and icon sets. The kit names them and always offers a free alternative.",
    examples: "Adobe Fonts, commercial typefaces · Font Awesome Pro",
  },
  {
    licence: "style_only",
    title: "Described, never copied",
    body: "Anything that belongs to the site. Your agent recreates the feel, not the file.",
    examples: "Logos, photos, illustrations, custom icons, the site's own words",
  },
];

export function StyleNeverAssets() {
  return (
    <section className="border-t border-border px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="label-micro">Style, never assets</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.035em] text-balance sm:text-[44px]">
            Every item in a kit says what you can ship.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-surface md:grid-cols-3">
          {ITEMS.map((item, index) => (
            <div
              key={item.licence}
              className={index > 0 ? "border-t border-border p-6 md:border-l md:border-t-0 sm:p-7" : "p-6 sm:p-7"}
            >
              <LicenceBadge licence={item.licence} />
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</p>
              <p className="mt-5 border-t border-dashed border-border pt-4 text-[13px] leading-relaxed text-fg-subtle">
                {item.examples}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
