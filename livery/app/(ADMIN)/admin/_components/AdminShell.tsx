import Link from "next/link";
import { adminSignOut } from "@/app/actions/adminSignOut";
import { ExternalLink, LogOut } from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "./AdminNav";

// The admin frame: a quiet sidebar with every section and live counts, and
// the page on the right. On phones the sidebar becomes a scrolling bar.
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const { count: openTakedowns } = await getAdminClient().from("takedown_requests").select("*", { count: "exact", head: true }).eq("status", "open");
  return (
    <div className="flex min-h-svh flex-1 flex-col lg:flex-row">
      <aside className="border-b border-border bg-surface lg:sticky lg:top-0 lg:h-svh lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 px-5">
            <LogoMark />
            <span className="text-[16px] font-semibold tracking-tight">livery</span>
            <span className="ml-1 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-fg-muted">Admin</span>
          </div>
          <AdminNav badges={{ takedowns: openTakedowns ?? 0 }} />
          <div className="mt-auto hidden space-y-1 border-t border-border p-3 lg:block">
            <Link href="/" target="_blank" className="flex h-9 items-center gap-2.5 rounded-[10px] px-3 text-[13px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">
              <ExternalLink className="size-4" /> View the site
            </Link>
            <div className="flex items-center justify-between px-1">
              <form action={adminSignOut}>
                <button type="submit" className="flex h-9 items-center gap-2.5 rounded-[10px] px-2 text-[13px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">
                  <LogOut className="size-4" /> Sign out
                </button>
              </form>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
