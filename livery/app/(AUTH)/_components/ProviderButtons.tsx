"use client";

import { useTransition } from "react";
import { signInWithProvider } from "@/app/actions/signInWithProvider";
import { LoaderCircle } from "@/components/icons";
import { cn } from "@/lib/utils";

// Brand marks as the providers publish them (the Google "G" keeps its four colours).
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-current">
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57v-2.04c-3.34.73-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3" />
    </svg>
  );
}

export function ProviderButtons({ next, label = "Continue" }: { next?: string; label?: string }) {
  const [pending, start] = useTransition();
  const button = "flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-border bg-surface text-sm font-medium transition-colors hover:border-border-strong hover:bg-surface-2 disabled:opacity-60";
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {(
        [
          ["google", "Google", GoogleMark],
          ["github", "GitHub", GitHubMark],
        ] as const
      ).map(([provider, name, Mark]) => (
        <button key={provider} type="button" disabled={pending} onClick={() => start(() => signInWithProvider(provider, next))} className={cn(button)}>
          {pending ? <LoaderCircle className="size-4 animate-[spin_0.9s_linear_infinite]" /> : <Mark />}
          {label} with {name}
        </button>
      ))}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-[12px] text-fg-subtle" aria-hidden>
      <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
    </div>
  );
}
