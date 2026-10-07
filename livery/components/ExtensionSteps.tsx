"use client";

import Link from "next/link";
import { useAuth } from "@/app/_context/AuthContext";
import { ArrowUpRight, Check } from "@/components/icons";
import { EXTENSION_STORE_URL } from "@/constants/constants";
import { cn } from "@/lib/utils";

// The three steps to add pages behind a login: install the extension, connect
// it to your account, then measure a page. Used on /extension, on Create and
// on kit pages. `kitTitle` names the kit to pick in the extension.
export function ExtensionSteps({ kitTitle, compact = false }: { kitTitle?: string; compact?: boolean }) {
  const auth = useAuth();
  const signedIn = Boolean(auth.user);
  const steps = [
    {
      title: "Install the extension",
      body: EXTENSION_STORE_URL ? "Free, for Chrome, Edge and Brave." : "Coming soon to the Chrome Web Store.",
      action: EXTENSION_STORE_URL ? (
        <a href={EXTENSION_STORE_URL} target="_blank" rel="noreferrer" className={button}>
          Add to Chrome <ArrowUpRight className="size-3.5" />
        </a>
      ) : (
        <span className={cn(button, "pointer-events-none opacity-60")}>Coming soon</span>
      ),
    },
    {
      title: "Connect it to your account",
      body: signedIn ? "Opens a page with a one-time code the extension picks up." : "Sign in first; your private kits are kept in your account.",
      action: (
        <Link href={signedIn ? "/extension/connect" : "/sign-in?next=/extension/connect"} className={button}>
          {signedIn ? "Connect" : "Sign in"}
        </Link>
      ),
    },
    {
      title: "Measure a page behind your login",
      body: kitTitle ? `Open the page, click the Livery icon and choose ${kitTitle}. You'll see what's sent before anything leaves the page.` : "Open the page, click the Livery icon and choose a kit. You'll see what's sent before anything leaves the page.",
      action: null,
    },
  ];
  return (
    <ol className={cn("grid grid-cols-1 overflow-hidden rounded-[18px] border border-border bg-surface", compact ? "" : "shadow-card md:grid-cols-3")}>
      {steps.map((step, index) => (
        <li key={step.title} className={cn("flex gap-4 p-5", index > 0 && (compact ? "border-t border-border" : "border-t border-border md:border-l md:border-t-0"), !compact && "md:flex-col md:gap-3 md:p-6")}>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[11px] text-accent-ink">
            {index === 1 && signedIn ? <Check className="size-3.5" /> : String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[14.5px] font-semibold tracking-tight">{step.title}</span>
            <span className="text-[13px] leading-relaxed text-fg-muted">{step.body}</span>
            {step.action && <span className="mt-2">{step.action}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

const button = "inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium text-fg transition-colors hover:border-accent";
