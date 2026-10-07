import Link from "next/link";
import { adminSignOut } from "@/app/actions/adminSignOut";
import { ArrowUpRight } from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { adminConfigured, isAdmin } from "@/lib/adminSession";
import { kitPath } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { cn } from "@/lib/utils";
import { adminFailedBuilds, adminFailures, adminKits, adminOverview, adminOwners, adminTakedowns } from "@/services/admin";
import { ForgetButton, TakedownButtons, WithdrawButton } from "./_components/Rows";
import { SignInForm } from "./_components/SignInForm";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "kits", label: "Kits" },
  { id: "takedowns", label: "Takedowns" },
  { id: "failures", label: "Blocked sites" },
  { id: "builds", label: "Failed builds" },
  { id: "owners", label: "Site owners" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const when = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") : "—");

function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty: boolean }) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-border bg-surface shadow-card">
      <table className="w-full min-w-[40rem] text-left text-[13px]">
        <thead>
          <tr className="border-b border-border">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-mono text-[10.5px] font-medium uppercase tracking-wide text-fg-subtle">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-4 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-10 text-center text-sm text-fg-muted">Nothing here.</p>}
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: number; note?: string; tone?: "alert" }) {
  return (
    <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card">
      <p className="label-micro">{label}</p>
      <p className={cn("tabular mt-3 text-3xl font-bold tracking-tight", tone === "alert" && value > 0 && "text-danger")}>{value.toLocaleString("en-US")}</p>
      {note && <p className="mt-1 text-[12.5px] text-fg-subtle">{note}</p>}
    </div>
  );
}

async function Overview() {
  const o = await adminOverview();
  const peak = Math.max(1, ...o.days.map((d) => d.ready + d.failed));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Kits" value={o.kits.pages + o.kits.sites + o.kits.tastes} note={`${o.kits.pages} pages · ${o.kits.sites} multi-page · ${o.kits.tastes} tastes`} />
        <Stat label="Published versions" value={o.versions.ready} note={`${o.versions.withdrawn} withdrawn · ${o.versions.building} building now`} />
        <Stat label="Open takedowns" value={o.takedowns} tone="alert" note="Needs a decision" />
        <Stat label="Failed builds, 24h" value={o.versions.failedToday} tone="alert" note={`${o.failures} sites blocked right now`} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card">
          <p className="label-micro">Builds, last 7 days</p>
          <div className="mt-6 flex h-40 gap-3">
            {o.days.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 flex-col justify-end gap-0.5" title={`${d.ready} published · ${d.failed} failed`}>
                  {d.failed > 0 && <span className="w-full rounded-t-[4px] bg-danger/70" style={{ height: `${(d.failed / peak) * 100}%` }} />}
                  <span className={cn("w-full bg-accent", d.failed ? "" : "rounded-t-[4px]")} style={{ height: `${(d.ready / peak) * 100}%`, minHeight: d.ready ? 2 : 0 }} />
                </div>
                <span className="font-mono text-[10.5px] text-fg-subtle">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card">
          <p className="label-micro">Site owners</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-fg-muted">Opted in (livery.json)</dt><dd className="tabular font-semibold">{o.owners.granted}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-muted">Opted out or taken down</dt><dd className="tabular font-semibold">{o.owners.forbidden}</dd></div>
          </dl>
          <p className="mt-6 border-t border-dashed border-border pt-4 text-[12.5px] leading-relaxed text-fg-subtle">
            Rate limits, the extractor version and secrets live in the environment and constants; change them there and redeploy.
          </p>
        </div>
      </div>
    </div>
  );
}

async function Kits({ query }: { query: string }) {
  const rows = await adminKits(query);
  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <input type="hidden" name="tab" value="kits" />
        <input name="q" defaultValue={query} placeholder="Search slug, domain or curator" className="h-10 w-full max-w-sm rounded-full border border-border bg-surface px-4 text-sm placeholder:text-fg-subtle focus-visible:border-accent focus-visible:outline-none" />
      </form>
      <Table head={["Kit", "Kind", "Version", "Status", "Published", ""]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.versionId}>
            <td>
              <Link href={kitPath(r.slug, r.version)} target="_blank" className="inline-flex items-center gap-1 font-medium hover:underline">
                {r.name} <ArrowUpRight className="size-3 text-fg-subtle" />
              </Link>
              <span className="block font-mono text-[11px] text-fg-subtle">{r.slug}</span>
            </td>
            <td className="capitalize text-fg-muted">{r.kind === "site" ? "multi-page" : r.kind}</td>
            <td className="font-mono">v{r.version}</td>
            <td>
              <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-medium", r.status === "ready" ? "bg-accent-soft text-accent-soft-fg" : "bg-danger-soft text-danger")}>{r.status === "ready" ? "Live" : "Withdrawn"}</span>
            </td>
            <td className="font-mono text-[12px] text-fg-muted">{when(r.publishedAt)}</td>
            <td className="text-right">{r.status === "ready" && <WithdrawButton versionId={r.versionId} />}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

async function Takedowns() {
  const rows = await adminTakedowns();
  return (
    <Table head={["Site", "From", "Message", "Received", "Status", ""]} empty={!rows.length}>
      {rows.map((r) => (
        <tr key={r.id} className="align-top">
          <td className="font-medium">{r.domain}</td>
          <td className="text-fg-muted">
            {r.email}
            <span className="block text-[11.5px] capitalize text-fg-subtle">{r.relationship}</span>
          </td>
          <td className="max-w-[24rem] whitespace-pre-wrap text-fg-muted">{r.message}</td>
          <td className="font-mono text-[12px] text-fg-muted">{when(r.created_at)}</td>
          <td className="capitalize">{r.status}</td>
          <td className="text-right">{r.status === "open" && <TakedownButtons id={r.id} />}</td>
        </tr>
      ))}
    </Table>
  );
}

async function Failures() {
  const rows = await adminFailures();
  return (
    <Table head={["Page", "Reason", "Hits", "Last seen", "Retry after", ""]} empty={!rows.length}>
      {rows.map((r) => (
        <tr key={r.source_url}>
          <td>
            <span className="font-medium">{r.source_url.replace("https://", "")}</span>
            {r.detail && <span className="block max-w-[22rem] truncate text-[11.5px] text-fg-subtle">{r.detail}</span>}
          </td>
          <td className="font-mono text-[12px]">{r.reason}</td>
          <td className="tabular">{r.hits}</td>
          <td className="font-mono text-[12px] text-fg-muted">{when(r.last_at)}</td>
          <td className="font-mono text-[12px] text-fg-muted">{when(r.retry_after)}</td>
          <td className="text-right">
            <ForgetButton sourceUrl={r.source_url} />
          </td>
        </tr>
      ))}
    </Table>
  );
}

async function Builds() {
  const rows = await adminFailedBuilds();
  return (
    <Table head={["Kit", "Error", "Started"]} empty={!rows.length}>
      {rows.map((r) => (
        <tr key={r.id} className="align-top">
          <td className="font-mono text-[12px]">{r.slug}</td>
          <td className="max-w-[32rem] break-words font-mono text-[12px] text-danger">{r.error ?? "—"}</td>
          <td className="font-mono text-[12px] text-fg-muted">{when(r.at)}</td>
        </tr>
      ))}
    </Table>
  );
}

async function Owners() {
  const rows = await adminOwners();
  return (
    <Table head={["Site", "Decision", "Last checked"]} empty={!rows.length}>
      {rows.map((r) => (
        <tr key={r.domain}>
          <td className="font-medium">{r.domain}</td>
          <td>
            <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-medium", r.opt_in === "granted" ? "bg-accent-soft text-accent-soft-fg" : "bg-danger-soft text-danger")}>{r.opt_in === "granted" ? "Opted in" : "Blocked"}</span>
          </td>
          <td className="font-mono text-[12px] text-fg-muted">{when(r.grant_checked_at)}</td>
        </tr>
      ))}
    </Table>
  );
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  if (!adminConfigured() || !(await isAdmin())) return <SignInForm />;
  const params = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === params.tab) ? (params.tab as Tab) : "overview";
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";

  return (
    <div className="mx-auto w-full max-w-[80rem] px-4 pb-24 sm:px-6">
      <header className="flex h-16 items-center gap-3 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="text-[17px] font-semibold tracking-tight">livery</span>
        </Link>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-fg-muted">Admin</span>
        <form action={adminSignOut} className="ml-auto">
          <button type="submit" className="text-[13px] text-fg-muted transition-colors hover:text-fg">
            Sign out
          </button>
        </form>
      </header>

      <nav aria-label="Admin sections" className="mt-8 flex gap-0.5 overflow-x-auto rounded-full border border-border bg-surface p-1 sm:w-fit">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "overview" ? "/admin" : `/admin?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn("inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-sm font-medium transition-colors", tab === t.id ? "bg-surface-3 text-fg" : "text-fg-muted hover:text-fg")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        {!supabaseConfigured() ? (
          <p className="text-sm text-fg-muted">Supabase is not configured on this deployment.</p>
        ) : tab === "kits" ? (
          <Kits query={query} />
        ) : tab === "takedowns" ? (
          <Takedowns />
        ) : tab === "failures" ? (
          <Failures />
        ) : tab === "builds" ? (
          <Builds />
        ) : tab === "owners" ? (
          <Owners />
        ) : (
          <Overview />
        )}
      </div>
    </div>
  );
}
