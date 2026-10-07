import { isAdmin } from "@/lib/adminSession";
import { adminFailedBuilds } from "@/services/admin";
import { AdminPage, DataTable, when } from "../_components/AdminPage";

export default async function BuildsPage() {
  if (!(await isAdmin())) return null;
  const rows = await adminFailedBuilds();
  return (
    <AdminPage title="Failed builds" description="The last 50 builds that didn't publish, with the error each one hit. Nothing here was ever public.">
      <DataTable head={["Kit", "Error", "Started"]} empty={!rows.length} emptyText="No failed builds.">
        {rows.map((r) => (
          <tr key={r.id} className="align-top">
            <td className="font-mono text-[12px]">{r.slug}</td>
            <td className="max-w-[40rem] break-words font-mono text-[12px] text-danger">{r.error ?? "—"}</td>
            <td className="whitespace-nowrap font-mono text-[12px] text-fg-muted">{when(r.at)}</td>
          </tr>
        ))}
      </DataTable>
    </AdminPage>
  );
}
