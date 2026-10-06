"use client";

import { Accordion as AccordionPrimitive } from "radix-ui";
import { Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-border last:border-b-0", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex flex-1 items-center justify-between gap-6 py-5 text-left text-[15px] font-medium tracking-tight text-fg transition-colors hover:text-fg-muted",
          className,
        )}
        {...props}
      >
        {children}
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-fg-muted transition-[transform,background-color,color] duration-300 ease-out-soft group-data-[state=open]:rotate-45 group-data-[state=open]:bg-accent-soft group-data-[state=open]:text-accent-soft-fg">
          <Plus className="size-3.5" weight="bold" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-[accordion-up_220ms_var(--ease-out-soft)] data-[state=open]:animate-[accordion-down_260ms_var(--ease-out-soft)]"
      {...props}
    >
      <div className={cn("pb-5 pr-12 text-[15px] leading-relaxed text-fg-muted", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
