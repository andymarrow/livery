import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[background-color,border-color,color,transform] duration-150 ease-out-soft",
    "active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    // Arrows lean the way they point while hovered.
    "[&_.lucide-arrow-right]:transition-transform [&_.lucide-arrow-up-right]:transition-transform [&_.lucide-arrow-left]:transition-transform",
    "hover:[&_.lucide-arrow-right]:translate-x-0.5 hover:[&_.lucide-arrow-up-right]:translate-x-px hover:[&_.lucide-arrow-up-right]:-translate-y-px hover:[&_.lucide-arrow-left]:-translate-x-0.5",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent font-semibold text-on-accent shadow-card hover:bg-accent-hover disabled:bg-surface-3 disabled:text-fg-subtle disabled:opacity-100 disabled:shadow-none",
        secondary: "border border-border bg-surface text-fg shadow-card hover:border-border-strong hover:bg-surface-2",
        ghost: "text-fg-muted hover:bg-surface-3/60 hover:text-fg",
        inverse: "bg-fg text-bg hover:opacity-90",
        soft: "bg-accent-soft text-accent-soft-fg hover:bg-accent-soft/70",
      },
      size: {
        sm: "h-8 rounded-full px-3.5 text-xs [&_svg]:size-3.5",
        md: "h-9 rounded-full px-4 text-sm [&_svg]:size-4",
        lg: "h-11 rounded-full px-5 text-sm [&_svg]:size-4",
        icon: "size-9 rounded-full [&_svg]:size-[17px]",
        "icon-sm": "size-8 rounded-full [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return <Component data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
