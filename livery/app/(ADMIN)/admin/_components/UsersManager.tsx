"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/services/moderation";
import { when } from "./AdminPage";
import { inputClass } from "./Controls";
import { UserActions } from "./UserActions";

type Filter = "all" | "kits" | "extension" | "banned" | "new";

const PROVIDERS: Record<string, string> = { google: "Google", github: "GitHub", email: "Email" };

export function UsersManager({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [week] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "kits" && !u.kits.total) return false;
      if (filter === "extension" && !u.connections && !u.captures) return false;
      if (filter === "banned" && !u.banned) return false;
      if (filter === "new" && new Date(u.createdAt).getTime() < week) return false;
      return !q || [u.email ?? "", u.name ?? "", u.id].some((v) => v.toLowerCase().includes(q));
    });
  }, [users, query, filter, week]);
  const counts: Record<Filter, number> = {
    all: users.length,
    kits: users.filter((u) => u.kits.total).length,
    extension: users.filter((u) => u.connections || u.captures).length,
    banned: users.filter((u) => u.banned).length,
    new: users.filter((u) => new Date(u.createdAt).getTime() >= week).length,
  };
  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email, name or id" aria-label="Search users" className={cn(inputClass, "pl-9")} />
        </div>
        <div role="tablist" aria-label="Filter users" className="flex shrink-0 gap-0.5 overflow-x-auto rounded-[10px] bg-surface-2 p-1">
          {(
            [
              ["all", "Everyone"],
              ["new", "New this week"],
              ["kits", "Own kits"],
              ["extension", "Use the extension"],
              ["banned", "Banned"],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={cn("h-8 whitespace-nowrap rounded-[8px] px-3 text-[12.5px] font-medium transition-colors", filter === id ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg")}>
              {label} <span className="ml-1 font-mono text-[11px] text-fg-subtle">{counts[id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-[14px] border border-border bg-surface">
        <table className="w-full min-w-[60rem] text-left text-[13px]">
          <thead className="bg-surface-2/50">
            <tr className="border-b border-border text-[11.5px] text-fg-muted">
              <th className="h-10 px-4 font-medium">Account</th>
              <th className="px-3 font-medium">Signs in with</th>
              <th className="px-3 font-medium">Joined</th>
              <th className="px-3 font-medium">Last sign-in</th>
              <th className="px-3 text-right font-medium">Kits</th>
              <th className="px-3 text-right font-medium">Measured pages</th>
              <th className="px-3 font-medium">Status</th>
              <th className="w-12 px-4"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-2/40">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                    <Avatar name={u.name ?? u.email ?? "?"} url={u.avatar} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium hover:underline">{u.name ?? u.email ?? "No name"}</span>
                      <span className="block truncate text-[11.5px] text-fg-subtle">{u.email ?? u.id}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 text-[12.5px] text-fg-muted">{u.providers.map((p) => PROVIDERS[p] ?? p).join(", ") || "Email"}</td>
                <td className="px-3 font-mono text-[12px] text-fg-muted">{when(u.createdAt).slice(0, 10)}</td>
                <td className="px-3 font-mono text-[12px] text-fg-muted">{u.lastSignInAt ? when(u.lastSignInAt) : "Never"}</td>
                <td className="px-3 text-right font-mono text-[12px]" title={`${u.kits.public} public · ${u.kits.private} not public (private or withdrawn)`}>
                  {u.kits.total || <span className="text-fg-subtle">0</span>}
                  {u.kits.private > 0 && <span className="text-fg-subtle"> ({u.kits.public} public)</span>}
                </td>
                <td className="px-3 text-right font-mono text-[12px]">{u.captures || <span className="text-fg-subtle">0</span>}</td>
                <td className="px-3">
                  <span className="flex flex-wrap gap-1">
                    {u.banned && <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium text-danger">Banned</span>}
                    {!u.confirmed && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">Unconfirmed</span>}
                    {u.connections > 0 && <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent-soft-fg">Extension</span>}
                    {!u.banned && u.confirmed && !u.connections && <span className="text-[12px] text-fg-subtle">Active</span>}
                  </span>
                </td>
                <td className="px-4 text-right">
                  <UserActions user={u} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="px-4 py-14 text-center text-sm text-fg-muted">No accounts match.</p>}
      </div>
      <p className="mt-3 text-[12px] text-fg-subtle">{shown.length} of {users.length} accounts.</p>
    </>
  );
}

export function Avatar({ name, url, size = "size-8" }: { name: string; url: string | null; size?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- provider avatar, https only (checked in the database)
    <img src={url} alt="" className={cn(size, "shrink-0 rounded-full border border-border object-cover")} referrerPolicy="no-referrer" />
  ) : (
    <span aria-hidden className={cn(size, "flex shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold uppercase text-accent-soft-fg")}>
      {name.slice(0, 1)}
    </span>
  );
}
