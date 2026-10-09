import { Check, X } from "@/components/icons";
import type { Limits } from "@/lib/billing/plans";

// Every difference between the plans, grouped the way people use Livery.
type Value = string | boolean;

function Cell({ value, pro }: { value: Value; pro?: boolean }) {
  if (typeof value === "string") return <span className={pro ? "font-medium text-fg" : "text-fg-muted"}>{value}</span>;
  return value ? <Check className={pro ? "size-4 text-accent-ink" : "size-4 text-fg-muted"} strokeWidth={2.25} aria-label="Included" /> : <X className="size-4 text-fg-subtle" aria-label="Not included" />;
}

export function CompareTable({ limits }: { limits: Limits }) {
  const { free, pro } = limits;
  const groups: { name: string; rows: [string, Value, Value][] }[] = [
    {
      name: "Library",
      rows: [
        ["Browse, install and download every public kit", "Unlimited", "Unlimited"],
        ["Save kits to your account", true, true],
      ],
    },
    {
      name: "Building",
      rows: [
        ["New kits from any website", `${free.buildsPerHour} an hour`, `${pro.buildsPerHour} an hour`],
        ["Pages of one site, and tastes", `Up to ${free.tasteSites} sites`, `Up to ${pro.tasteSites} sites`],
        ["Keep tastes and multi-page kits private", free.privateCombined, pro.privateCombined],
        ["Publish when you're ready", true, true],
      ],
    },
    {
      name: "Browser extension",
      rows: [
        ["Pages behind your login", `${free.capturesPerHour} an hour`, `${pro.capturesPerHour} an hour`],
        ["Private kits from the extension", true, true],
      ],
    },
  ];
  return (
    <section aria-labelledby="compare">
      <h2 id="compare" className="text-xl font-semibold tracking-tight sm:text-2xl">Compare the Plans</h2>
      <div className="mt-6 overflow-hidden rounded-[20px] border border-border bg-surface shadow-card">
        <table className="w-full table-fixed text-left text-[13.5px]">
          <colgroup>
            <col />
            <col className="w-[6.5rem] sm:w-44" />
            <col className="w-[6.5rem] sm:w-44" />
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-4 sm:px-6"><span className="sr-only">Feature</span></th>
              <th className="px-3 py-4 text-[13px] font-semibold">Free</th>
              <th className="px-3 py-4 text-[13px] font-semibold text-accent-ink">Pro</th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.name} className="[&:last-child>tr:last-child]:border-0">
              <tr className="border-b border-border bg-surface-2/50">
                <th colSpan={3} scope="colgroup" className="px-4 py-2 font-mono text-[10.5px] font-medium uppercase tracking-wider text-fg-subtle sm:px-6">{group.name}</th>
              </tr>
              {group.rows.map(([label, f, p]) => (
                <tr key={label} className="border-b border-border">
                  <th scope="row" className="px-4 py-3.5 font-normal sm:px-6">{label}</th>
                  <td className="px-3 py-3.5"><Cell value={f} /></td>
                  <td className="px-3 py-3.5"><Cell value={p} pro /></td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
