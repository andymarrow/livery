"use client";

import { useActionState } from "react";
import { CircleCheck as CheckCircle, LoaderCircle as CircleNotch } from "lucide-react";
import { submitTakedown, type TakedownResult } from "@/app/actions/submitTakedown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TakedownForm() {
  const [result, action, pending] = useActionState<TakedownResult | null, FormData>(submitTakedown, null);
  if (result?.ok) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5">
        <CheckCircle className="mt-0.5 size-5 shrink-0 text-accent" />
        <div>
          <p className="font-medium">Request received for {result.domain}</p>
          <p className="mt-1 text-sm text-fg-muted">We&apos;ll reply by email, usually within two working days. For an immediate opt-out, publish an opt-out file.</p>
        </div>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium">Your site</span>
          <Input name="domain" placeholder="example.com" required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium">Email</span>
          <Input name="email" type="email" placeholder="you@example.com" required />
        </label>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium">You are</legend>
        <div className="flex flex-wrap gap-4 text-sm text-fg-muted">
          {[["owner", "The owner"], ["agent", "Acting for the owner"], ["other", "Someone else"]].map(([value, label], i) => (
            <label key={value} className="inline-flex items-center gap-2">
              <input type="radio" name="relationship" value={value} defaultChecked={i === 0} className="size-4 accent-[var(--accent)]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium">What should we do?</span>
        <textarea
          name="message"
          required
          rows={4}
          placeholder="Withdraw every kit built from our site, and stop building new ones."
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle hover:border-border-strong focus-visible:border-accent focus-visible:outline-none"
        />
      </label>
      {result && !result.ok && <p role="alert" className="text-sm text-danger">{result.error}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending && <CircleNotch strokeWidth={2.25} className="animate-[spin_0.9s_linear_infinite]" />}
        Send request
      </Button>
    </form>
  );
}
