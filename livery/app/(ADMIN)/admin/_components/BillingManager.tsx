"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSaveBilling } from "@/app/actions/adminSaveBilling";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import type { BillingSettings, Plan, PlanLimits } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { inputClass, Switch } from "./Controls";

const PLANS: [Plan, string, string][] = [
  ["visitor", "Visitors", "No account"],
  ["free", "Free", "Signed in"],
  ["pro", "Pro", "Paying, or given Pro"],
];

const FIELDS: [keyof PlanLimits, string, string][] = [
  ["buildsPerHour", "New builds / hour", "Kits already in the library never count."],
  ["capturesPerHour", "Extension pages / hour", "Visitors can't use the extension."],
  ["tasteSites", "Sites per taste", "2 to 12."],
];

// The payments switch, every plan's limits and the prices shown, in one form.
export function BillingManager({ initial }: { initial: BillingSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [settings, setSettings] = useState(initial);
  const [pending, start] = useTransition();
  const changed = JSON.stringify(settings) !== JSON.stringify(initial);
  const setLimit = (plan: Plan, key: keyof PlanLimits, value: number | boolean) => setSettings((s) => ({ ...s, limits: { ...s.limits, [plan]: { ...s.limits[plan], [key]: value } } }));
  const save = () =>
    start(async () => {
      const result = await adminSaveBilling(settings);
      if (result.ok) {
        toast({ title: "Saved", description: settings.enabled ? "Payments are on." : "Payments are off: Livery is free for everyone.", tone: "success" });
        router.refresh();
      } else toast({ title: "Couldn't save", description: result.error, tone: "danger" });
    });
  return (
    <div className="space-y-6">
      <section className={cn("rounded-[14px] border bg-surface px-5", settings.enabled ? "border-accent" : "border-border")}>
        <Switch
          checked={settings.enabled}
          onChange={(enabled) => setSettings((s) => ({ ...s, enabled }))}
          label={settings.enabled ? "Payments are on" : "Payments are off"}
          hint={settings.enabled ? "Pricing is in the footer, checkout is open, and people near a limit see a short note about Pro." : "Livery is free for everyone: no checkout, no Pro prompts, Pricing hidden from the footer and sitemap. The limits below still apply; Pro limits apply only to people you give Pro by hand."}
        />
      </section>

      <section className="overflow-x-auto rounded-[14px] border border-border bg-surface">
        <table className="w-full min-w-[40rem] text-left text-[13px]">
          <thead className="bg-surface-2/50">
            <tr className="border-b border-border text-[11.5px] text-fg-muted">
              <th className="h-10 px-4 font-medium">Limit</th>
              {PLANS.map(([id, name, note]) => (
                <th key={id} className="px-3 font-medium">
                  {name} <span className="font-normal text-fg-subtle">· {note}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDS.map(([key, label, hint]) => (
              <tr key={key} className="border-b border-border">
                <td className="px-4 py-3">
                  <span className="block font-medium">{label}</span>
                  <span className="block text-[11.5px] text-fg-subtle">{hint}</span>
                </td>
                {PLANS.map(([plan]) => (
                  <td key={plan} className="px-3 py-3">
                    <input
                      type="number"
                      min={key === "tasteSites" ? 2 : 0}
                      max={key === "tasteSites" ? 12 : 10000}
                      value={settings.limits[plan][key] as number}
                      onChange={(e) => setLimit(plan, key, Number(e.target.value))}
                      disabled={plan === "visitor" && key === "capturesPerHour"}
                      aria-label={`${label} for ${plan}`}
                      className={cn(inputClass, "h-9 w-28 disabled:opacity-40")}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-4 py-3">
                <span className="block font-medium">Private tastes and multi-page kits</span>
                <span className="block text-[11.5px] text-fg-subtle">Extension kits are always private.</span>
              </td>
              {PLANS.map(([plan]) => (
                <td key={plan} className="px-3 py-3">
                  <input type="checkbox" checked={settings.limits[plan].privateCombined} disabled={plan === "visitor"} onChange={(e) => setLimit(plan, "privateCombined", e.target.checked)} aria-label={`Private kits for ${plan}`} className="size-4 accent-[var(--accent)] disabled:opacity-40" />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <section className="flex flex-wrap items-end gap-4 rounded-[14px] border border-border bg-surface p-5">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-fg-muted">Monthly price shown (USD)</span>
          <input type="number" min={0} step={0.01} value={settings.prices.month} onChange={(e) => setSettings((s) => ({ ...s, prices: { ...s.prices, month: Number(e.target.value) } }))} className={cn(inputClass, "w-36")} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-fg-muted">Yearly price shown (USD)</span>
          <input type="number" min={0} step={0.01} value={settings.prices.year} onChange={(e) => setSettings((s) => ({ ...s, prices: { ...s.prices, year: Number(e.target.value) } }))} className={cn(inputClass, "w-36")} />
        </label>
        <p className="max-w-sm text-[12px] text-fg-subtle">These are the prices on /pricing. What people are charged is set on the products in Polar; keep the two the same.</p>
      </section>

      <div className="flex items-center justify-end gap-3">
        {changed && <span className="text-[12.5px] text-fg-muted">Unsaved changes</span>}
        <Button variant="ghost" disabled={!changed || pending} onClick={() => setSettings(initial)}>Reset</Button>
        <Button disabled={!changed || pending} onClick={save}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
