import { isAdmin } from "@/lib/adminSession";
import { cn } from "@/lib/utils";
import { adminOwners } from "@/services/admin";
import { AdminPage, DataTable, when } from "../_components/AdminPage";

export default async function OwnersPage() {
  if (!(await isAdmin())) return null;
  const rows = await adminOwners();
  return (
    <AdminPage title="Site owners" description="Sites whose owners opted in with livery.json, or opted out and were blocked.">
      <DataTable head={["Site", "Decision", "Last checked"]} empty={!rows.length} emptyText="No owner decisions yet.">
        {rows.map((r) => (
          <tr key={r.domain}>
            <td className="font-medium">{r.domain}</td>
            <td><span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-medium", r.opt_in === "granted" ? "bg-accent-soft text-accent-soft-fg" : "bg-danger-soft text-danger")}>{r.opt_in === "granted" ? "Opted in" : "Blocked"}</span></td>
            <td className="font-mono text-[12px] text-fg-muted">{when(r.grant_checked_at)}</td>
          </tr>
        ))}
      </DataTable>
    </AdminPage>
  );
}
