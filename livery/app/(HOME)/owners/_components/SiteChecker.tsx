"use client";

import { useActionState } from "react";
import { CheckCircle, CircleNotch, XCircle } from "@phosphor-icons/react";
import { checkSite, type CheckResult } from "@/app/actions/checkSite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SiteChecker() {
  const [result, action, pending] = useActionState<CheckResult | null, FormData>(checkSite, null);
  return (
    <div>
      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="check-domain" className="sr-only">Your site</label>
        <Input id="check-domain" name="domain" placeholder="example.com" autoComplete="off" spellCheck={false} className="h-11 sm:flex-1" required />
        <Button type="submit" size="lg" disabled={pending} className="h-11">
          {pending && <CircleNotch weight="bold" className="animate-[spin_0.9s_linear_infinite]" />}
          {pending ? "Checking…" : "Check my site"}
        </Button>
      </form>
      {result && "error" in result && <p role="alert" className="mt-3 text-sm text-danger">{result.error}</p>}
      {result && "items" in result && (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface" aria-live="polite">
          {result.items.map((item) => (
            <li key={item.label} className="flex items-start gap-3 px-4 py-3">
              {item.ok ? <CheckCircle weight="fill" className="mt-0.5 size-4 shrink-0 text-accent" /> : <XCircle weight="fill" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />}
              <span className="min-w-0">
                <span className="block text-[14px] font-medium">{item.label}</span>
                <span className="block break-words text-[13px] text-fg-muted">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
