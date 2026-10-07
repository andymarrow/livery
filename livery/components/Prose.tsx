import { cn } from "@/lib/utils";

// Long-form reading layout: one comfortable column, quiet headings.
export function Prose({ kicker, title, updated, children, className }: { kicker: string; title: string; updated?: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={cn("mx-auto w-full max-w-2xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20", className)}>
      <p className="label-micro">{kicker}</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl">{title}</h1>
      {updated && <p className="mt-4 text-[13px] text-fg-subtle">Last updated {updated}</p>}
      <div
        className={cn(
          "mt-10 text-sm leading-[1.75] text-fg-muted",
          "[&_h2]:mb-3 [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-fg",
          "[&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:marker:text-fg-subtle",
          "[&_strong]:font-semibold [&_strong]:text-fg [&_a]:font-medium [&_a]:text-accent-ink [&_a]:underline-offset-4 hover:[&_a]:underline",
          "[&_code]:rounded-md [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-fg",
          "[&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-[1.7] [&_pre]:text-fg [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        )}
      >
        {children}
      </div>
    </article>
  );
}
