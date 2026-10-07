// The top of every admin page: title, one line of context, and its actions.
export function AdminPage({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-4 pb-20 sm:px-8">
      <header className="flex flex-col gap-4 border-b border-border py-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-[13.5px] text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="pt-6">{children}</div>
    </div>
  );
}

export function DataTable({ head, children, empty, emptyText = "Nothing here yet." }: { head: string[]; children: React.ReactNode; empty: boolean; emptyText?: string }) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-border bg-surface">
      <table className="w-full min-w-[44rem] text-left text-[13px]">
        <thead className="bg-surface-2/50">
          <tr className="border-b border-border">
            {head.map((h, i) => (
              <th key={`${h}-${i}`} className="h-10 px-4 text-[11.5px] font-medium text-fg-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-4 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0 [&_tr]:transition-colors [&_tr:hover]:bg-surface-2/40">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-14 text-center text-sm text-fg-muted">{emptyText}</p>}
    </div>
  );
}

export const when = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") : "—");
