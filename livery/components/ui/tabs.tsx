"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

// Segmented control: a sunken track with a raised white (or lifted dark) active tab.
export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex h-9 items-center gap-1 rounded-full border border-border bg-surface p-0.5", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-full items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-medium text-fg-muted",
        "transition-[background-color,color] duration-150 hover:bg-surface-3/60 hover:text-fg",
        "data-[state=active]:bg-accent data-[state=active]:font-semibold data-[state=active]:text-on-accent data-[state=active]:hover:bg-accent",
        "[&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("mt-4 focus-visible:outline-none data-[state=active]:animate-rise", className)}
      {...props}
    />
  );
}
