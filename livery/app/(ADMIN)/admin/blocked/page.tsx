import { isAdmin } from "@/lib/adminSession";
import { adminFailures } from "@/services/admin";
import { AdminPage, DataTable, when } from "../_components/AdminPage";
import { ForgetButton } from "../_components/Rows";

export default async function BlockedPage() {
  if (!(await isAdmin())) return null;
  const rows = await adminFailures();
  return (
    <AdminPage title="Blocked sites" description="Pages Livery couldn't read, remembered so they aren't hit again. Allow a retry once the cause is fixed.">
      <DataTable head={["Page", "Reason", "Hits", "Last seen", "Retry after", ""]} empty={!rows.length} emptyText="No blocked pages.">
        {rows.map((r) => (
          <tr key={r.source_url}>
            <td><span className="font-medium">{r.source_url.replace("https://", "")}</span>{r.detail && <span className="block max-w-[24rem] truncate text-[11.5px] text-fg-subtle">{r.detail}</span>}</td>
            <td><span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11px]">{r.reason}</span></td>
            <td className="tabular">{r.hits}</td>
            <td className="font-mono text-[12px] text-fg-muted">{when(r.last_at)}</td>
            <td className="font-mono text-[12px] text-fg-muted">{when(r.retry_after)}</td>
            <td className="text-right"><ForgetButton sourceUrl={r.source_url} /></td>
          </tr>
        ))}
      </DataTable>
    </AdminPage>
  );
}
