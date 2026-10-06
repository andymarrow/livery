import Link from "next/link";
import { ArrowLeft, Prohibit, WarningCircle } from "@phosphor-icons/react/ssr";
import type { ReadFailureReason } from "@/lib/extract/types";
import { failureCopy } from "@/lib/kit/failure";
import { Button } from "@/components/ui/button";

const OWNER_REASONS: ReadFailureReason[] = ["bot_protection", "robots_disallowed"];

// One sentence, the reason, and what to do next.
export function FailurePanel({ reason, host }: { reason: ReadFailureReason; host: string }) {
  const copy = failureCopy(reason, host);
  const refused = reason === "sensitive_page" || reason === "blocked_by_owner" || reason === "unsafe_url";
  const Icon = refused ? Prohibit : WarningCircle;
  return (
    <div className="mx-auto w-full max-w-lg text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border bg-surface text-fg-muted">
        <Icon weight="duotone" className="size-6" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.035em] text-balance">{copy.title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-fg-muted text-pretty">{copy.body}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-fg">{copy.next}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="secondary">
          <Link href="/#get-a-kit">
            <ArrowLeft weight="bold" /> Try another site
          </Link>
        </Button>
        {OWNER_REASONS.includes(reason) && (
          <Button asChild variant="ghost">
            <Link href="/owners">For site owners</Link>
          </Button>
        )}
      </div>
      <p className="mt-10 font-mono text-[11px] text-fg-subtle">reason: {reason}</p>
    </div>
  );
}
