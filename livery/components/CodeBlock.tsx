import { CopyButton } from "@/components/CopyButton";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  title?: string;
  language?: string;
  className?: string;
  maxHeight?: number;
};

// A quiet code panel: file name on the left, copy on the right, monospace body.
export function CodeBlock({ code, title, language, className, maxHeight }: CodeBlockProps) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-surface", className)}>
      <div className="flex h-11 items-center justify-between gap-3 border-b border-border pl-4 pr-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-xs text-fg-muted">{title ?? "snippet"}</span>
          {language && <span className="label-micro !text-[10px]">{language}</span>}
        </div>
        <CopyButton value={code} variant="ghost" size="sm" />
      </div>
      <pre
        className="overflow-auto p-4 font-mono text-[12.5px] leading-[1.7] text-fg"
        style={maxHeight ? { maxHeight } : undefined}
        tabIndex={0}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
