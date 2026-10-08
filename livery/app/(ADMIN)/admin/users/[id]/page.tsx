import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "@/components/icons";
import { isAdmin } from "@/lib/adminSession";
import { adminUser } from "@/services/moderation";
import { AdminPage, when } from "../../_components/AdminPage";
import { Avatar } from "../../_components/UsersManager";
import { UserActions } from "../../_components/UserActions";

export const dynamic = "force-dynamic";

function Panel({ title, children, count }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-border bg-surface">
      <h2 className="flex items-center gap-2 border-b border-border px-5 py-3.5 text-[13.5px] font-semibold">
        {title}
        {count !== undefined && <span className="font-mono text-[11.5px] font-normal text-fg-subtle">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

export default async function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  if (!(await isAdmin())) return null;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const user = await adminUser(id);
  if (!user) notFound();
  return (
    <AdminPage
      title={user.name ?? user.email ?? "Account"}
      description={`${user.email ?? "No email"} · joined ${when(user.createdAt).slice(0, 10)} · last sign-in ${user.lastSignInAt ? when(user.lastSignInAt) : "never"}`}
      actions={
        <>
          <Link href="/admin/users" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-medium text-fg-muted hover:text-fg">
            <ArrowLeft className="size-4" /> All users
          </Link>
          <UserActions user={user} showProfileLink={false} />
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name ?? user.email ?? "?"} url={user.avatar} size="size-14" />
        <dl className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Kits", `${user.kits.total}`, `${user.kits.public} public · ${user.kits.private} not public`],
            ["Measured pages", `${user.captures}`, "with the extension"],
            ["Connections", `${user.connections}`, "active extensions"],
            ["Saved", `${user.saved}`, "kits bookmarked"],
            ["Status", user.banned ? "Banned" : user.confirmed ? "Active" : "Unconfirmed", user.providers.join(", ") || "email"],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-[12px] border border-border bg-surface px-4 py-3">
              <dt className="text-[12px] text-fg-muted">{label}</dt>
              <dd className={`tabular mt-1 text-lg font-semibold ${value === "Banned" ? "text-danger" : ""}`}>{value}</dd>
              <dd className="text-[11.5px] text-fg-subtle">{note}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Kits they own" count={user.ownedKits.length}>
          {user.ownedKits.length ? (
            <ul>
              {user.ownedKits.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 last:border-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{k.name}</span>
                    <span className="block truncate font-mono text-[11.5px] text-fg-subtle">{k.slug}</span>
                  </span>
                  {k.hidden && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">Hidden</span>}
                  <span className="flex flex-wrap gap-1">
                    {k.versions.map((v) =>
                      v.visibility === "public" && v.status === "ready" ? (
                        <a key={v.version} href={`/k/${k.slug}/v${v.version}`} target="_blank" rel="noreferrer" className="rounded-full border border-border px-2 py-0.5 font-mono text-[11.5px] text-fg-muted hover:border-border-strong hover:text-fg">
                          v{v.version}
                        </a>
                      ) : (
                        <span key={v.version} title={v.status === "withdrawn" ? "Withdrawn" : "Private"} className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 font-mono text-[11.5px] text-fg-subtle">
                          {v.status === "withdrawn" ? null : <LockKeyhole className="size-3" />}v{v.version}
                        </span>
                      ),
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-[13px] text-fg-muted">No kits yet.</p>
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title="Pages measured with the extension" count={user.recentCaptures.length}>
            {user.recentCaptures.length ? (
              <ul>
                {user.recentCaptures.map((c) => (
                  <li key={`${c.url}-${c.createdAt}`} className="flex items-center gap-3 border-b border-border px-5 py-2.5 last:border-0">
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{c.url.replace(/^https?:\/\//, "")}</span>
                    <span className="font-mono text-[11px] text-fg-subtle">{when(c.createdAt).slice(5)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-center text-[13px] text-fg-muted">None.</p>
            )}
          </Panel>
          <Panel title="Browser extension connections" count={user.tokens.length}>
            {user.tokens.length ? (
              <ul>
                {user.tokens.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 border-b border-border px-5 py-2.5 last:border-0">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px]">{t.label}</span>
                      <span className="block font-mono text-[11px] text-fg-subtle">connected {when(t.createdAt).slice(0, 10)} · {t.lastUsedAt ? `used ${when(t.lastUsedAt)}` : "never used"}</span>
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${t.revoked ? "bg-surface-2 text-fg-subtle" : "bg-accent-soft text-accent-soft-fg"}`}>{t.revoked ? "Ended" : "Active"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-center text-[13px] text-fg-muted">None.</p>
            )}
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
