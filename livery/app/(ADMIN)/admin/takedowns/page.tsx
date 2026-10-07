import { isAdmin } from "@/lib/adminSession";
import { adminTakedowns } from "@/services/admin";
import { AdminPage, DataTable, when } from "../_components/AdminPage";
import { TakedownButtons } from "../_components/Rows";

export default async function TakedownsPage() {
  if (!(await isAdmin())) return null;
  const rows = await adminTakedowns();
  return (
    <AdminPage title="Takedowns" description="Requests from site owners. Actioning one blocks the site and withdraws every kit that used it, tastes included.">
      <DataTable head={["Site", "From", "Message", "Received", "Status", ""]} empty={!rows.length} emptyText="No takedown requests.">
        {rows.map((r) => (
          <tr key={r.id} className="align-top">
            <td className="font-medium">{r.domain}</td>
            <td className="text-fg-muted">{r.email}<span className="block text-[11.5px] capitalize text-fg-subtle">{r.relationship}</span></td>
            <td className="max-w-[26rem] whitespace-pre-wrap text-fg-muted">{r.message}</td>
            <td className="font-mono text-[12px] text-fg-muted">{when(r.created_at)}</td>
            <td><span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium capitalize">{r.status}</span></td>
            <td className="text-right">{r.status === "open" && <TakedownButtons id={r.id} />}</td>
          </tr>
        ))}
      </DataTable>
    </AdminPage>
  );
}
