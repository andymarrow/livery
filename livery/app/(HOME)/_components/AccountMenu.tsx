"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { displayNameOf, useAuth } from "@/app/_context/AuthContext";
import { signOut } from "@/app/actions/signOut";
import { Bookmark, LogOut, User } from "@/components/icons";
import { cn } from "@/lib/utils";

export function Avatar({ name, url, className }: { name: string; url: string | null | undefined; className?: string }) {
  return (
    <span className={cn("flex size-8 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-[12px] font-semibold uppercase text-fg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- provider avatar, https only (checked in the database) */}
      {url ? <img src={url} alt="" className="size-full object-cover" referrerPolicy="no-referrer" /> : name.slice(0, 1) || "?"}
    </span>
  );
}

// The header's account control: "Sign in" when signed out, an avatar menu when signed in.
export function AccountMenu() {
  const auth = useAuth();
  const pathname = usePathname();
  if (!auth.ready) return <span className="size-9" aria-hidden />;
  if (!auth.user) {
    return (
      <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`} className="hidden h-9 items-center rounded-full px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg sm:inline-flex">
        Sign in
      </Link>
    );
  }
  const name = displayNameOf(auth);
  const item = "flex h-9 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] text-fg-muted outline-none transition-colors data-[highlighted]:bg-surface-2 data-[highlighted]:text-fg";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger aria-label="Your account" className="rounded-full outline-none ring-accent ring-offset-2 ring-offset-bg focus-visible:ring-2">
        <Avatar name={name} url={auth.profile?.avatar_url ?? (auth.user.user_metadata?.avatar_url as string | undefined)} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-60 rounded-[14px] border border-border bg-surface p-1.5 shadow-raised data-[state=open]:animate-[fade-in_140ms_ease-out]">
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="truncate text-[13.5px] font-semibold">{name}</p>
            <p className="truncate text-[12px] text-fg-subtle">{auth.user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild className={item}>
            <Link href="/me">
              <User className="size-4" /> My kits
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}>
            <Link href="/me#saved">
              <Bookmark className="size-4" /> Saved
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={item} onSelect={() => void signOut()}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
