import { isAdmin } from "@/lib/adminSession";
import { polarConfigured } from "@/lib/billing/polar";
import { getBillingSettings } from "@/lib/billing/settings";
import { SITE } from "@/constants/constants";
import { adminProAccounts } from "@/services/moderation";
import { AdminPage, DataTable, when } from "../_components/AdminPage";
import { BillingManager } from "../_components/BillingManager";

export const dynamic = "force-dynamic";

// Which Polar settings are present (never their values).
const SETUP: [string, string][] = [
  ["POLAR_ACCESS_TOKEN", "Organization access token"],
  ["POLAR_WEBHOOK_SECRET", "Webhook signing secret"],
  ["POLAR_PRODUCT_PRO_MONTHLY", "Pro monthly product id"],
  ["POLAR_PRODUCT_PRO_YEARLY", "Pro yearly product id"],
  ["POLAR_SERVER", "sandbox while testing, production when live (optional)"],
];

export default async function BillingPage() {
  if (!(await isAdmin())) return null;
  const [settings, pros] = await Promise.all([getBillingSettings(), adminProAccounts()]);
  return (
    <AdminPage title="Billing" description="Switch payments on or off, set every plan's limits, and see who has Pro. Payments go through Polar.">
      {pros === null && (
        <p className="mb-6 rounded-[12px] border border-border bg-surface px-4 py-3 text-[13px] text-fg-muted">
          Run <span className="font-mono text-fg">supabase/migrations/20261009100000_plans.sql</span> in Supabase to save settings and give Pro.
        </p>
      )}
      <BillingManager initial={settings} />

      <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-[14px] border border-border bg-surface p-5">
          <h2 className="text-[13.5px] font-semibold">Polar setup {polarConfigured() ? <span className="ml-2 rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent-soft-fg">Ready</span> : <span className="ml-2 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-muted">Not set up</span>}</h2>
          <ul className="mt-3 space-y-1.5">
            {SETUP.map(([key, label]) => (
              <li key={key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
                <span className={`size-2 shrink-0 rounded-full ${process.env[key] ? "bg-accent" : "bg-border-strong"}`} />
                <span className="font-mono text-[12px]">{key}</span>
                <span className="text-fg-subtle">{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] text-fg-muted">Webhook URL for Polar:</p>
          <p className="mt-1 rounded-[8px] bg-surface-2 px-3 py-2 break-all font-mono text-[12px]">{SITE.url}/api/billing/webhook</p>
          <p className="mt-3 text-[12px] text-fg-subtle">Events: subscription.* (created, updated, active, canceled, uncanceled, revoked) and customer.state_changed. The full steps are in docs/billing.md.</p>
        </section>

        <section>
          <h2 className="mb-3 text-[13.5px] font-semibold">Pro accounts · {pros?.length ?? 0}</h2>
          <DataTable head={["Account", "How", "Renews / ends"]} empty={!pros?.length} emptyText="Nobody has Pro yet. Give it to someone from their row in Users.">
            {(pros ?? []).map((p) => (
              <tr key={p.userId}>
                <td><a href={`/admin/users/${p.userId}`} className="hover:underline">{p.email ?? p.userId.slice(0, 8)}</a></td>
                <td>{p.source === "admin" ? "Given by you" : `Polar · ${p.interval ?? "?"}ly`}</td>
                <td className="font-mono text-[12px] text-fg-muted">{p.source === "admin" ? "—" : `${when(p.currentPeriodEnd).slice(0, 10)}${p.cancelAtPeriodEnd ? " (ends)" : ""}`}</td>
              </tr>
            ))}
          </DataTable>
        </section>
      </div>
    </AdminPage>
  );
}
