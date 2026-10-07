"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ban, Boxes, Flag, LayoutDashboard, Layers, ServerCrash, Users } from "@/components/icons";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/kits", label: "Kits", icon: Boxes },
  { href: "/admin/tastes", label: "Tastes", icon: Layers },
  { href: "/admin/takedowns", label: "Takedowns", icon: Flag, badge: "takedowns" as const },
  { href: "/admin/blocked", label: "Blocked sites", icon: Ban },
  { href: "/admin/builds", label: "Failed builds", icon: ServerCrash },
  { href: "/admin/owners", label: "Site owners", icon: Users },
];

export function AdminNav({ badges }: { badges: { takedowns: number } }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:pb-0">
      <ul className="flex gap-1 lg:flex-col">
        {ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const count = item.badge ? badges[item.badge] : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-9 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 text-[13.5px] font-medium transition-colors duration-150",
                  active ? "bg-surface-2 text-fg" : "text-fg-muted hover:bg-surface-2/60 hover:text-fg",
                )}
              >
                {active && <span aria-hidden className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-accent lg:block" />}
                <item.icon className={cn("size-4", active ? "text-accent-ink" : "")} />
                {item.label}
                {count > 0 && <span className="ml-auto rounded-full bg-danger px-1.5 font-mono text-[10.5px] font-semibold text-white">{count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
