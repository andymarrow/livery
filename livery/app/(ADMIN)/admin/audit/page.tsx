import { isAdmin } from "@/lib/adminSession";
import { adminAudit } from "@/services/moderation";
import { AdminPage, DataTable, when } from "../_components/AdminPage";

export const dynamic = "force-dynamic";

const ACTIONS: Record<string, string> = {
  kit_deleted: "Deleted a kit",
  kit_updated: "Edited a kit",
  kits_hidden: "Hid kits",
  kits_shown: "Showed kits",
  version_withdrawn: "Withdrew a version",
  user_banned: "Banned a user",
  user_unbanned: "Lifted a ban",
  user_deleted: "Deleted an account",
  user_connections_revoked: "Disconnected an extension",
  user_kits_hidden: "Hid a user's kits",
  user_kits_shown: "Showed a user's kits",
};

export default async function AuditPage() {
  if (!(await isAdmin())) return null;
  const entries = await adminAudit(300);
  return (
    <AdminPage title="Audit log" description="Every change made from this admin area, newest first.">
      {entries === null ? (
        <p className="rounded-[14px] border border-border bg-surface px-5 py-6 text-[13.5px] text-fg-muted">
          The log starts once <span className="font-mono text-fg">supabase/migrations/20261008200000_admin_moderation.sql</span> has been run in Supabase.
        </p>
      ) : (
        <DataTable head={["When", "Action", "On", "Details"]} empty={!entries.length} emptyText="No admin actions yet.">
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="whitespace-nowrap font-mono text-[12px] text-fg-muted">{when(e.at)}</td>
              <td className="font-medium">{ACTIONS[e.action] ?? e.action}</td>
              <td className="max-w-72 truncate font-mono text-[12px]">{e.target ?? "—"}</td>
              <td className="max-w-80 truncate font-mono text-[11.5px] text-fg-subtle">{Object.keys(e.detail).length ? JSON.stringify(e.detail) : ""}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </AdminPage>
  );
}
