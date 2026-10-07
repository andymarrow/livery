"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, LoaderCircle as CircleNotch, Hourglass as HourglassMedium, CircleAlert as WarningCircle } from "@/components/icons";
import Link from "next/link";
import type { BuildEvent } from "@/app/api/build/route";
import type { BuildStage, ReadFailureReason } from "@/lib/extract/types";
import { failureCopy } from "@/lib/kit/failure";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STAGES: { id: BuildStage; label: string; hint: string }[] = [
  { id: "checking", label: "Checking the site", hint: "Safe address, redirects and robots.txt" },
  { id: "rendering", label: "Rendering three screen sizes", hint: "1440, 390 and 820 pixels wide" },
  { id: "extracting", label: "Measuring the design", hint: "Colour, type, spacing, icons, motion" },
  { id: "writing", label: "Writing the rules", hint: "The reasons behind the values" },
  { id: "packaging", label: "Packaging the kit", hint: "Copy guard, archive and sha256" },
  { id: "publishing", label: "Publishing", hint: "A permanent, versioned link" },
];

type State =
  | { phase: "running"; stage: BuildStage | null; detail?: string }
  | { phase: "waiting" }
  | { phase: "failed"; reason: ReadFailureReason }
  | { phase: "rate_limited"; resetAt: string }
  | { phase: "error"; message: string };

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.round((now - since) / 1000));
  return <span className="tabular">{seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`}</span>;
}

export function Builder({ url, host }: { url: string; host: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "running", stage: null });
  const [started] = useState(() => Date.now());
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // React runs effects twice in development
    ran.current = true;
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;

    const waitForOther = () => {
      setState({ phase: "waiting" });
      poll = setInterval(async () => {
        const res = await fetch(`/api/kits/status?url=${encodeURIComponent(url)}`, { cache: "no-store" }).catch(() => null);
        const data = res?.ok ? ((await res.json()) as { ready: boolean; path?: string }) : null;
        if (data?.ready && data.path && !cancelled) router.replace(data.path);
      }, 4000);
    };

    const handle = (event: BuildEvent) => {
      if (event.type === "stage") setState({ phase: "running", stage: event.stage, detail: event.detail });
      else if (event.type === "ready") router.replace(event.path);
      else if (event.type === "building") waitForOther();
      else if (event.type === "failed") setState({ phase: "failed", reason: event.reason as ReadFailureReason });
      else if (event.type === "rate_limited") setState({ phase: "rate_limited", resetAt: event.resetAt });
      else setState({ phase: "error", message: event.message });
    };

    (async () => {
      try {
        const response = await fetch("/api/build", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) if (line.trim()) handle(JSON.parse(line) as BuildEvent);
        }
      } catch {
        if (!cancelled) setState({ phase: "error", message: "The connection dropped. The build may still finish; refresh in a minute." });
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [url, router]);

  if (state.phase === "failed") {
    const copy = failureCopy(state.reason, host);
    return (
      <Outcome icon={<WarningCircle className="size-6" />} title={copy.title} body={copy.body} next={copy.next} code={state.reason} owners={state.reason === "bot_protection" || state.reason === "robots_disallowed"} />
    );
  }
  if (state.phase === "rate_limited") {
    return (
      <Outcome
        icon={<HourglassMedium className="size-6" />}
        title="Daily Build Limit Reached"
        body="New builds are limited per visitor, because each one renders a site and calls a model. Kits already in the library are always free."
        next={`You can build again after ${new Date(state.resetAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`}
      />
    );
  }
  if (state.phase === "error") {
    return <Outcome icon={<WarningCircle className="size-6" />} title="Something Went Wrong" body={state.message} next="Nothing was published. You can try again." retry />;
  }

  const activeIndex = state.phase === "running" && state.stage ? STAGES.findIndex((s) => s.id === state.stage) : state.phase === "waiting" ? -1 : 0;

  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="label-micro text-center">Building a kit</p>
      <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight sm:text-4xl">{host}</h1>
      <p className="mt-3 text-center text-sm text-fg-muted">
        {state.phase === "waiting" ? "Someone else is building this kit right now. It will open here when it's ready." : "Usually about a minute. You can leave; the kit will be in the library."}
      </p>

      <ol className="mt-10 overflow-hidden rounded-[18px] border border-border bg-surface shadow-card">
        {STAGES.map((stage, index) => {
          const done = activeIndex > index;
          const active = activeIndex === index && state.phase === "running";
          return (
            <li key={stage.id} className={cn("flex items-center gap-4 border-b border-border px-5 py-4 transition-colors duration-300 last:border-b-0", active && "bg-surface-2/60")}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                  done ? "border-accent bg-accent text-on-accent" : active ? "border-accent text-accent-ink" : "border-border text-fg-subtle",
                )}
              >
                {done ? <Check strokeWidth={2.25} className="size-3.5" /> : active ? <CircleNotch strokeWidth={2.25} className="size-3.5 animate-[spin_0.9s_linear_infinite]" /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-medium transition-colors", done || active ? "text-fg" : "text-fg-subtle")}>{stage.label}</span>
                <span className="block truncate text-[12.5px] text-fg-subtle">{active && state.phase === "running" && state.detail ? state.detail : stage.hint}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex items-center justify-between text-[13px] text-fg-subtle">
        <Link href="/" className="inline-flex items-center gap-1.5 transition-colors hover:text-fg">
          <ArrowLeft strokeWidth={2.25} className="size-3.5" /> Back
        </Link>
        <span>
          Elapsed <Elapsed since={started} />
        </span>
      </div>
    </div>
  );
}

function Outcome({ icon, title, body, next, code, owners, retry }: { icon: React.ReactNode; title: string; body: string; next: string; code?: string; owners?: boolean; retry?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-lg text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-[18px] border border-border bg-surface text-fg-muted shadow-card">{icon}</span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted text-pretty">{body}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg">{next}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {retry && <Button onClick={() => window.location.reload()}>Try again</Button>}
        <Button asChild variant="secondary">
          <Link href="/#get-a-kit">
            <ArrowLeft strokeWidth={2.25} /> Try Another Site
          </Link>
        </Button>
        {owners && (
          <Button asChild variant="ghost">
            <Link href="/owners">For site owners</Link>
          </Button>
        )}
      </div>
      {code && <p className="mt-10 font-mono text-[11px] text-fg-subtle">reason: {code}</p>}
    </div>
  );
}
