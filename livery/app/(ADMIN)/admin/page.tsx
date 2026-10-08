import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { isAdmin } from "@/lib/adminSession";
import { kitHome } from "@/lib/kit/urls";
import { cn } from "@/lib/utils";
import { adminKitList, adminOverview } from "@/services/admin";
import { adminActivity, adminUsers } from "@/services/moderation";
import { ActivityFeed } from "./_components/ActivityFeed";
import { AdminPage, when } from "./_components/AdminPage";

export const dynamic = "force-dynamic";

function Stat({ label, value, note, href, alert }: { label: string; value: number; note: string; href: string; alert?: boolean }) {
  return (
    <Link href={href} className="group rounded-[14px] border border-border bg-surface p-5 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] font-medium text-fg-muted">{label}</p>
        <ArrowRight className="size-3.5 text-fg-subtle opacity-0 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <p className={cn("tabular mt-2 text-[28px] font-semibold tracking-tight", alert && value > 0 && "text-danger")}>{value.toLocaleString("en-US")}</p>
      <p className="mt-0.5 text-[12.5px] text-fg-subtle">{note}</p>
    </Link>
  );
}

// Accounts created in the last seven days.
function joinedThisWeek(users: { createdAt: string }[]) {
  const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return users.filter((u) => new Date(u.createdAt).getTime() >= week).length;
}

export default async function AdminOverview() {
  if (!(await isAdmin())) return null;
  const [o, kits, users, activity] = await Promise.all([adminOverview(), adminKitList(), adminUsers().catch(() => []), adminActivity(10).catch(() => [])]);
  const newUsers = joinedThisWeek(users);
  const extensionUsers = users.filter((u) => u.connections > 0).length;
  const captures = users.reduce((n, u) => n + u.captures, 0);
  const banned = users.filter((u) => u.banned);
  const privateKits = kits.filter((k) => k.latest?.status === "ready" && k.latest.visibility === "private").length;
  const withdrawnKits = kits.filter((k) => k.latest?.status === "withdrawn");
  const bannedIds = new Set(banned.map((u) => u.id));
  const bannedKits = kits.filter((k) => k.owner && bannedIds.has(k.owner.id) && !k.hidden && k.latest?.status === "ready");
  const popular = [...kits].filter((k) => k.latest?.status === "ready").sort((a, b) => b.stats.views - a.stats.views).slice(0, 5);
  const attention = [
    o.takedowns ? { text: `${o.takedowns} takedown request${o.takedowns === 1 ? "" : "s"} waiting`, href: "/admin/takedowns", danger: true } : null,
    o.versions.failedToday ? { text: `${o.versions.failedToday} build${o.versions.failedToday === 1 ? "" : "s"} failed today`, href: "/admin/builds", danger: true } : null,
    bannedKits.length ? { text: `${bannedKits.length} kit${bannedKits.length === 1 ? "" : "s"} by banned users still in the library`, href: "/admin/kits", danger: true } : null,
    withdrawnKits.length ? { text: `${withdrawnKits.length} withdrawn kit${withdrawnKits.length === 1 ? "" : "s"} you could delete`, href: "/admin/kits", danger: false } : null,
    privateKits ? { text: `${privateKits} kit${privateKits === 1 ? "" : "s"} private to their owners`, href: "/admin/kits", danger: false } : null,
  ].filter((x): x is { text: string; href: string; danger: boolean } => Boolean(x));
  const peak = Math.max(1, ...o.days.map((d) => d.ready + d.failed));
  const recent = kits.slice(0, 6);
  return (
    <AdminPage title="Overview" description="The library at a glance. Every number links to where you can act on it.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat href="/admin/kits" label="Kits" value={o.kits.pages + o.kits.sites + o.kits.tastes} note={`${o.kits.pages} pages · ${o.kits.sites} multi-page · ${o.kits.tastes} tastes`} />
        <Stat href="/admin/kits" label="Published versions" value={o.versions.ready} note={`${o.versions.withdrawn} withdrawn · ${o.versions.building} building now`} />
        <Stat href="/admin/takedowns" label="Open takedowns" value={o.takedowns} note={o.takedowns ? "Waiting for your decision" : "All handled"} alert />
        <Stat href="/admin/builds" label="Failed builds today" value={o.versions.failedToday} note={`${o.failures} sites blocked right now`} alert />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat href="/admin/users" label="Accounts" value={users.length} note={`${newUsers} new this week`} />
        <Stat href="/admin/users" label="Use the extension" value={extensionUsers} note={`${captures} pages measured behind a login`} />
        <Stat href="/admin/kits" label="Private kits" value={privateKits} note="Visible only to their owners" />
        <Stat href="/admin/users" label="Banned" value={banned.length} note={banned.length ? "Can't sign in" : "Nobody"} alert />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <section className="rounded-[14px] border border-border bg-surface p-5">
          <h2 className="text-[13.5px] font-semibold">Needs attention</h2>
          {attention.length ? (
            <ul className="mt-3 space-y-1.5">
              {attention.map((a) => (
                <li key={a.text}>
                  <Link href={a.href} className="group flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] transition-colors hover:bg-surface-2">
                    <span className={cn("size-2 shrink-0 rounded-full", a.danger ? "bg-danger" : "bg-accent")} />
                    <span className="flex-1">{a.text}</span>
                    <ArrowRight className="size-3.5 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-fg-muted">Nothing. Everything is handled.</p>
          )}
          <h2 className="mt-6 text-[13.5px] font-semibold">Most viewed</h2>
          <ol className="mt-3 space-y-1">
            {popular.map((k, i) => (
              <li key={k.id} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-4 font-mono text-[11px] text-fg-subtle">{i + 1}</span>
                <Link href={kitHome(k.slug)} target="_blank" className="min-w-0 flex-1 truncate hover:underline">{k.name}</Link>
                <span className="font-mono text-[11.5px] text-fg-muted">{k.stats.views.toLocaleString("en-US")} views</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-[14px] border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold">Latest activity</h2>
            <Link href="/admin/activity" className="text-[12.5px] text-fg-muted hover:text-fg">All activity</Link>
          </div>
          <ActivityFeed items={activity} compact />
        </section>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="flex flex-col rounded-[14px] border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold">Builds, last 7 days</h2>
            <span className="flex items-center gap-3 text-[11.5px] text-fg-muted">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-accent" /> Published</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-danger/70" /> Failed</span>
            </span>
          </div>
          <div className="mt-6 flex min-h-44 flex-1 gap-3">
            {o.days.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="group/bar relative flex w-full flex-1 flex-col justify-end gap-0.5">
                  <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-fg px-1.5 py-0.5 font-mono text-[10.5px] text-bg opacity-0 transition-opacity group-hover/bar:opacity-100">
                    {d.ready} · {d.failed}
                  </span>
                  {d.failed > 0 && <span className="w-full rounded-t-[4px] bg-danger/70" style={{ height: `${(d.failed / peak) * 100}%` }} />}
                  <span className={cn("w-full bg-accent", !d.failed && "rounded-t-[4px]")} style={{ height: `${(d.ready / peak) * 100}%`, minHeight: d.ready ? 2 : 0 }} />
                </div>
                <span className="font-mono text-[10.5px] text-fg-subtle">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[14px] border border-border bg-surface">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-[13.5px] font-semibold">Latest kits</h2>
            <Link href="/admin/kits" className="text-[12.5px] text-fg-muted hover:text-fg">All kits</Link>
          </div>
          <ul className="mt-3">
            {recent.map((k) => (
              <li key={k.id} className="flex items-center gap-3 border-t border-border px-5 py-2.5">
                <span className="h-8 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed or public storage URL */}
                  {k.preview && <img src={k.preview} alt="" className="h-full w-full object-cover object-top" />}
                </span>
                <span className="min-w-0 flex-1">
                  <Link href={kitHome(k.slug)} target="_blank" className="block truncate text-[13px] font-medium hover:underline">{k.name}</Link>
                  <span className="block text-[11.5px] text-fg-subtle">{k.kind === "site" ? "Multi-page" : k.kind === "taste" ? "Taste" : "Page"} · v{k.latest!.version}</span>
                </span>
                <span className="font-mono text-[11px] text-fg-subtle">{when(k.latest!.publishedAt).slice(5)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="mt-6 text-[12.5px] text-fg-subtle">
        Opted in: {o.owners.granted} · Opted out or taken down: {o.owners.forbidden}. Rate limits, the extractor version and secrets live in the environment; change them there and redeploy.
      </p>
    </AdminPage>
  );
}
