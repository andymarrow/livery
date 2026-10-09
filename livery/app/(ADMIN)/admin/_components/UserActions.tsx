"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { adminDeleteUser } from "@/app/actions/adminDeleteUser";
import { adminRevokeUserConnections } from "@/app/actions/adminRevokeUserConnections";
import { adminSetUserBanned } from "@/app/actions/adminSetUserBanned";
import { adminSetUserKitsHidden } from "@/app/actions/adminSetUserKitsHidden";
import { adminSetUserPro } from "@/app/actions/adminSetUserPro";
import { Ban, Ellipsis, Eye, EyeOff, Puzzle, Star, Trash2 as Trash, User } from "@/components/icons";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { DangerDialog } from "./DangerDialog";

type Target = { id: string; email: string | null; banned: boolean; kits: { total: number }; connections: number; pro?: boolean };

// Everything an admin can do to an account, from the users table or a user's page.
export function UserActions({ user, showProfileLink = true, afterDelete }: { user: Target; showProfileLink?: boolean; afterDelete?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<null | "ban" | "delete" | "hide">(null);
  const name = user.email ?? user.id.slice(0, 8);
  const item = "flex cursor-default items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-surface-2";
  const done = (title: string) => {
    toast({ title, tone: "success" });
    setDialog(null);
    router.refresh();
  };
  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger aria-label={`Actions for ${name}`} className="flex size-8 items-center justify-center rounded-[8px] text-fg-subtle outline-none transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent data-[state=open]:bg-surface-2">
          <Ellipsis className="size-4" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-56 rounded-[12px] border border-border bg-surface p-1.5 shadow-card">
            {showProfileLink && (
              <DropdownMenu.Item asChild className={item}>
                <a href={`/admin/users/${user.id}`}>
                  <User className="size-4 text-fg-subtle" /> Open their page
                </a>
              </DropdownMenu.Item>
            )}
            {user.kits.total > 0 && (
              <>
                <DropdownMenu.Item className={item} onSelect={() => setDialog("hide")}>
                  <EyeOff className="size-4 text-fg-subtle" /> Hide all their kits
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={item}
                  onSelect={async () => {
                    await adminSetUserKitsHidden(user.id, false);
                    done(`${name}'s kits are back in the library`);
                  }}
                >
                  <Eye className="size-4 text-fg-subtle" /> Show all their kits
                </DropdownMenu.Item>
              </>
            )}
            {user.connections > 0 && (
              <DropdownMenu.Item
                className={item}
                onSelect={async () => {
                  await adminRevokeUserConnections(user.id);
                  done(`Disconnected ${name}'s browser extension`);
                }}
              >
                <Puzzle className="size-4 text-fg-subtle" /> Disconnect their extension
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item
              className={item}
              onSelect={async () => {
                const result = await adminSetUserPro(user.id, !user.pro);
                if (result.ok) done(user.pro ? `${name} is back on Free` : `${name} has Pro`);
                else toast({ title: "Couldn't change the plan", description: result.error, tone: "danger" });
              }}
            >
              <Star className="size-4 text-fg-subtle" /> {user.pro ? "Remove Pro" : "Give Pro"}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            {user.banned ? (
              <DropdownMenu.Item
                className={item}
                onSelect={async () => {
                  await adminSetUserBanned(user.id, false);
                  done(`${name} can sign in again`);
                }}
              >
                <Ban className="size-4 text-fg-subtle" /> Lift the ban
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item className={cn(item, "text-danger data-[highlighted]:bg-danger-soft")} onSelect={() => setDialog("ban")}>
                <Ban className="size-4" /> Ban
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item className={cn(item, "text-danger data-[highlighted]:bg-danger-soft")} onSelect={() => setDialog("delete")}>
              <Trash className="size-4" /> Delete account
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <DangerDialog
        open={dialog === "ban"}
        title={`Ban ${name}?`}
        description="They can't sign in, and every browser extension connected to their account is disconnected. Their kits stay as they are: hide them too if they shouldn't be in the library. You can lift the ban later."
        confirmLabel="Ban"
        onConfirm={async () => {
          await adminSetUserBanned(user.id, true);
          done(`${name} is banned`);
        }}
        onClose={() => setDialog(null)}
      />
      <DangerDialog
        open={dialog === "hide"}
        title={`Hide all ${user.kits.total} of ${name}'s kits?`}
        description="They stay at their addresses but leave the library and search. You can show them again from the same menu."
        confirmLabel="Hide them"
        onConfirm={async () => {
          await adminSetUserKitsHidden(user.id, true);
          done(`${name}'s kits are hidden`);
        }}
        onClose={() => setDialog(null)}
      />
      <DangerDialog
        open={dialog === "delete"}
        title={`Delete ${name}'s account?`}
        description="Their profile, saved kits, extension connections, private kits and the pages they measured for them are deleted. Kits they published stay in the library with no owner (delete those from Kits if needed). This can't be undone."
        confirmLabel="Delete account"
        typeToConfirm="delete"
        onConfirm={async () => {
          const result = await adminDeleteUser(user.id);
          if (!result.ok) {
            toast({ title: "Couldn't delete the account", description: result.error, tone: "danger" });
            return;
          }
          done(`${name}'s account is deleted`);
          afterDelete?.();
        }}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
