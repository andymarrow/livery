"use client";

import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "@/components/icons";
import { cn } from "@/lib/utils";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetTitle = SheetPrimitive.Title;

// A full-height panel attached to the edge of the viewport. Used for the mobile menu.
export function SheetContent({ className, children, ...props }: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-[fade-in_180ms_ease-out] data-[state=closed]:animate-[fade-out_150ms_ease-in]" />
      <SheetPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[min(22rem,88vw)] flex-col border-l border-border bg-bg focus:outline-none",
          "data-[state=open]:animate-[sheet-in_280ms_var(--ease-out-soft)] data-[state=closed]:animate-[sheet-out_180ms_ease-in]",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-[14px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">
          <X className="size-[18px]" />
          <span className="sr-only">Close menu</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
