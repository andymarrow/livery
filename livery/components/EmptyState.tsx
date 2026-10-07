import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[18px] border border-dashed border-border-strong px-6 py-14 text-center", className)}>
      {icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-[14px] border border-border bg-surface text-fg-muted [&_svg]:size-5">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
