"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleAlert, FileText, LoaderCircle, Plus, User, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { BuildEvent } from "@/app/api/build/route";
import type { CombineEvent } from "@/app/api/combine/route";
import type { BuildStage, ReadFailureReason } from "@/lib/extract/types";
import { failureCopy } from "@/lib/kit/failure";
import { readEvents } from "@/lib/kit/stream";
import { useTasteTray } from "@/lib/kit/tasteTray";
import { toShortcut } from "@/lib/url/shortcut";
import { cn } from "@/lib/utils";

type Kind = "site" | "taste";
const MIN = 2;
const MAX = 5;

const KINDS: { id: Kind; label: string; body: string; icon: React.ReactNode }[] = [
  { id: "site", label: "Pages of one site", body: "Home, pricing, docs. More context, one kit for that site.", icon: <FileText /> },
  { id: "taste", label: "A person's taste", body: "Sites by one designer. The habits they share, under their name.", icon: <User /> },
];

const PLACEHOLDERS: Record<Kind, string[]> = {
  site: ["linear.app", "linear.app/pricing", "linear.app/changelog", "linear.app/method", "linear.app/customers"],
  taste: ["rize.roggy.site", "goatrank.lol", "another-project.com", "a-fourth.site", "and-one-more.dev"],
};

const STAGE_LABEL: Record<BuildStage, string> = {
  checking: "Checking the site",
  rendering: "Rendering three screen sizes",
  extracting: "Measuring the design",
  writing: "Writing the rules",
  packaging: "Packaging",
  publishing: "Publishing",
};

type Step = { status: "waiting" | "running" | "done" | "failed"; detail?: string };

function StepIcon({ status }: { status: Step["status"] }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
        status === "done" && "border-accent bg-accent text-on-accent",
        status === "running" && "border-accent text-accent-ink",
        status === "failed" && "border-danger text-danger",
        status === "waiting" && "border-border text-fg-subtle",
      )}
    >
      {status === "done" ? (
        <Check strokeWidth={2.25} className="size-3.5" />
      ) : status === "running" ? (
        <LoaderCircle strokeWidth={2.25} className="size-3.5 animate-[spin_0.9s_linear_infinite]" />
      ) : status === "failed" ? (
        <X strokeWidth={2.5} className="size-3.5" />
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
    </span>
  );
}

export function CombineClient({ initialKind }: { initialKind: Kind }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [curator, setCurator] = useState("");
  const [links, setLinks] = useState<string[]>(["", ""]);
  const [touched, setTouched] = useState<boolean[]>([false, false]);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [combine, setCombine] = useState<Step>({ status: "waiting" });
  const [problem, setProblem] = useState<string | null>(null);
  const tray = useTasteTray();
  const [fromTray, setFromTray] = useState(false);
  const cancelled = useRef(false);
  const lastInput = useRef<HTMLInputElement>(null);
  const focusNew = useRef(false);

  // Reset on every mount: React mounts twice in development, and a flag left
  // true by the first cleanup would stop every run before it starts.
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);
  // Sites collected with "+ Taste" fill the list once, on arrival.
  const trayLinks = tray.links;
  useEffect(() => {
    if (fromTray || initialKind !== "taste" || !trayLinks.length) return;
    if (links.some((l) => l.trim())) return;
    const filledLinks = trayLinks.map((u) => u.replace(/^https:\/\//, "").replace(/\/$/, ""));
    const padded = filledLinks.length >= MIN ? filledLinks : [...filledLinks, ...Array(MIN - filledLinks.length).fill("")];
    /* eslint-disable react-hooks/set-state-in-effect -- the collection lives in localStorage, read after mount */
    setLinks(padded);
    setTouched(padded.map(() => false));
    setFromTray(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [trayLinks, fromTray, initialKind, links]);

  useEffect(() => {
    if (focusNew.current) lastInput.current?.focus();
    focusNew.current = false;
  }, [links.length]);

  // Each link checked as typed: valid address, not a repeat, and (for one site) the same host.
  const checked = useMemo(() => {
    const parsed = links.map((l) => toShortcut(l));
    const baseHost = parsed.find((p) => p.ok)?.ok ? (parsed.find((p) => p.ok) as { host: string }).host : null;
    return parsed.map((p, i) => {
      if (!p.ok) return { ok: false, message: p.reason === "empty" ? null : "That doesn't look like a website address." };
      if (parsed.slice(0, i).some((q) => q.ok && q.path === p.path)) return { ok: false, message: "This link is already in the list." };
      if (kind === "site" && baseHost && p.host !== baseHost) return { ok: false, message: `Pages of one site must all be on ${baseHost}.` };
      return { ok: true, message: null, path: p.path, host: p.host };
    });
  }, [links, kind]);
  const filled = checked.filter((c) => c.ok);
  const ready = filled.length >= MIN && checked.every((c, i) => c.ok || !links[i].trim());
  const hosts = [...new Set(filled.map((c) => c.host))];
  const preview = kind === "site" ? (hosts[0] ?? "your-site.com") : curator.trim() ? `${curator.trim()}'s taste` : hosts.length ? `A taste across ${hosts.slice(0, 2).join(", ")}${hosts.length > 2 ? ` +${hosts.length - 2}` : ""}` : "A shared taste";

  const update = (index: number, value: string) => setLinks((current) => current.map((l, i) => (i === index ? value : l)));
  const add = () => {
    if (links.length >= MAX) return;
    focusNew.current = true;
    setLinks((current) => [...current, ""]);
    setTouched((current) => [...current, false]);
  };
  const remove = (index: number) => {
    setLinks((current) => current.filter((_, i) => i !== index));
    setTouched((current) => current.filter((_, i) => i !== index));
  };

  async function buildLink(url: string, index: number): Promise<boolean> {
    const set = (step: Step) => setSteps((current) => current && current.map((s, i) => (i === index ? step : s)));
    set({ status: "running", detail: "Looking for an existing kit" });
    let outcome = "failed" as "ready" | "failed" | "waiting";
    try {
      const response = await fetch("/api/build", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      await readEvents<BuildEvent>(
        response,
        (event) => {
          if (event.type === "stage") set({ status: "running", detail: event.detail ? `${STAGE_LABEL[event.stage]}: ${event.detail}` : STAGE_LABEL[event.stage] });
          else if (event.type === "ready") {
            outcome = "ready";
            set({ status: "done", detail: event.cached ? "Already in the library" : "Built and published" });
          } else if (event.type === "building") outcome = "waiting";
          else if (event.type === "failed") {
            const host = toShortcut(url).ok ? (toShortcut(url) as { host: string }).host : url;
            set({ status: "failed", detail: failureCopy(event.reason as ReadFailureReason, host).body });
          } else if (event.type === "rate_limited") {
            setProblem(`You've reached the hourly build limit. Links already in the library still work; try again after ${new Date(event.resetAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
            set({ status: "failed", detail: "Build limit reached" });
          } else set({ status: "failed", detail: event.message });
        },
        () => cancelled.current,
      );
    } catch {
      set({ status: "failed", detail: "The connection dropped. Try again in a minute." });
      return false;
    }
    if (outcome !== "waiting") return outcome === "ready";

    // Someone else is building this page: wait for their kit.
    set({ status: "running", detail: "Someone else is building this page; waiting for it" });
    for (let attempt = 0; attempt < 60 && !cancelled.current; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const res = await fetch(`/api/kits/status?url=${encodeURIComponent(url)}`, { cache: "no-store" }).catch(() => null);
      const data = res?.ok ? ((await res.json()) as { ready: boolean }) : null;
      if (data?.ready) {
        set({ status: "done", detail: "Built and published" });
        return true;
      }
    }
    set({ status: "failed", detail: "Waited too long for this page. Try again in a minute." });
    return false;
  }

  async function run() {
    const urls = checked.filter((c) => c.ok).map((c) => c.path!);
    setProblem(null);
    setSteps(urls.map(() => ({ status: "waiting" })));
    setCombine({ status: "waiting" });
    requestAnimationFrame(() => document.getElementById("combine-progress")?.scrollIntoView({ behavior: "smooth", block: "start" }));

    // One link at a time: each is its own kit first, so cached ones are instant.
    for (const [index, url] of urls.entries()) {
      if (cancelled.current) return;
      if (!(await buildLink(url, index))) {
        setCombine({ status: "failed", detail: "Every link needs a kit before they can be combined." });
        return;
      }
    }

    setCombine({ status: "running", detail: "Merging the measurements" });
    try {
      const response = await fetch("/api/combine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, urls, curator: kind === "taste" ? curator.trim() || null : null }),
      });
      if (response.status === 400) throw new Error((await response.json()).error);
      await readEvents<CombineEvent>(
        response,
        (event) => {
          if (event.type === "stage") setCombine({ status: "running", detail: event.detail ?? STAGE_LABEL[event.stage] });
          else if (event.type === "ready") {
            setCombine({ status: "done", detail: "Opening your kit" });
            if (kind === "taste") tray.clear();
            router.push(event.path);
          } else if (event.type === "rate_limited") setCombine({ status: "failed", detail: "Build limit reached. Try again within the hour." });
          else if (event.type === "invalid") setCombine({ status: "failed", detail: event.message });
          else if (event.type === "needs_sources") setCombine({ status: "failed", detail: "Some links changed while building. Run it again." });
          else if (event.type === "failed") setCombine({ status: "failed", detail: `${event.url}: ${event.detail ?? event.reason}` });
          else if (event.type === "building") setCombine({ status: "running", detail: "Someone is combining these exact links right now; try again in a moment." });
          else if (event.type === "error") setCombine({ status: "failed", detail: event.message });
        },
        () => cancelled.current,
      );
    } catch (error) {
      setCombine({ status: "failed", detail: error instanceof Error ? error.message : "The connection dropped. Try again in a minute." });
    }
  }

  if (steps) {
    const urls = checked.filter((c) => c.ok).map((c) => c.path!);
    const failed = steps.some((s) => s.status === "failed") || combine.status === "failed";
    return (
      <div id="combine-progress" className="mx-auto w-full max-w-2xl scroll-mt-24">
        <p className="label-micro">{kind === "site" ? "Combining pages" : "Measuring a taste"}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">{preview}</h2>
        <p className="mt-2 text-sm text-fg-muted">Each link becomes its own kit first; links already in the library are instant. Then the measurements are merged.</p>

        <ol className="mt-8 overflow-hidden rounded-[18px] border border-border bg-surface shadow-card">
          {urls.map((url, index) => (
            <li key={url} className={cn("flex items-center gap-4 border-b border-border px-5 py-4 transition-colors duration-300", steps[index].status === "running" && "bg-surface-2/60")}>
              <StepIcon status={steps[index].status} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="font-mono text-[11px] text-fg-subtle">{String(index + 1).padStart(2, "0")}</span>
                  <span className="truncate">{url}</span>
                </span>
                <span className={cn("block truncate text-[12.5px]", steps[index].status === "failed" ? "text-danger" : "text-fg-subtle")}>{steps[index].detail ?? "Waiting"}</span>
              </span>
            </li>
          ))}
          <li className={cn("flex items-center gap-4 px-5 py-4", combine.status === "running" && "bg-surface-2/60")}>
            <StepIcon status={combine.status} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{kind === "site" ? "Combine into one site kit" : "Find the shared habits"}</span>
              <span className={cn("block text-[12.5px]", combine.status === "failed" ? "text-danger" : "text-fg-subtle")}>{combine.detail ?? "After every link is ready"}</span>
            </span>
          </li>
        </ol>

        {problem && (
          <p className="mt-4 flex gap-2 rounded-[14px] border border-border bg-surface px-4 py-3 text-sm text-fg-muted">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" /> {problem}
          </p>
        )}
        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={() => setSteps(null)} disabled={!failed} className="inline-flex items-center gap-1.5 text-[13px] text-fg-subtle transition-colors hover:text-fg disabled:opacity-0">
            <ArrowLeft strokeWidth={2.25} className="size-3.5" /> Edit the links
          </button>
          <span className="text-[13px] text-fg-subtle">You can leave; finished links stay in the library.</span>
        </div>
      </div>
    );
  }

  return (
    <form
      className="mx-auto w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(links.map(() => true));
        if (ready) void run();
      }}
    >
      <fieldset>
        <legend className="label-micro">What are you combining?</legend>
        <div role="radiogroup" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {KINDS.map((option) => {
            const active = kind === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKind(option.id)}
                className={cn(
                  "group relative flex gap-3 rounded-[18px] border bg-surface p-4 text-left transition-[border-color,background-color] duration-200",
                  active ? "border-accent" : "border-border hover:border-border-strong",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 [&_svg]:size-4",
                    active ? "border-accent bg-accent text-on-accent" : "border-border text-fg-muted group-hover:text-fg",
                  )}
                >
                  {option.icon}
                </span>
                <span>
                  <span className="block text-[15px] font-semibold tracking-tight">{option.label}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-fg-muted">{option.body}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className={cn("grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out-soft", kind === "taste" ? "mt-7 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0")} aria-hidden={kind !== "taste"}>
        <div className="overflow-hidden">
          <label htmlFor="curator" className="label-micro">Whose taste is it? (optional)</label>
          <input
            id="curator"
            value={curator}
            onChange={(e) => setCurator(e.target.value)}
            maxLength={40}
            tabIndex={kind === "taste" ? 0 : -1}
            placeholder="Andy"
            autoComplete="off"
            className="mt-3 h-12 w-full rounded-full border border-border bg-surface px-5 text-[15px] transition-[border-color] duration-150 placeholder:text-fg-subtle hover:border-border-strong focus-visible:border-accent focus-visible:outline-none"
          />
          <p className="mt-2 px-1 text-[12.5px] text-fg-subtle">Named tastes are listed under that name, so others can browse everything one person picked.</p>
        </div>
      </div>

      <div className="mt-7">
        <div className="flex items-baseline justify-between">
          <p className="label-micro">
            Links
            {fromTray && kind === "taste" && <span className="ml-2 normal-case tracking-normal text-accent-ink">from your collection</span>}
          </p>
          <p className="text-[12.5px] text-fg-subtle tabular">
            {filled.length} of {MIN}–{MAX}
          </p>
        </div>
        <ol className="mt-3 space-y-2.5">
          {links.map((link, index) => {
            const check = checked[index];
            const showError = touched[index] && check.message;
            return (
              <li key={index} className="animate-rise">
                <div className="flex items-center gap-2">
                  <span className={cn("w-6 shrink-0 text-right font-mono text-[11px] transition-colors", check.ok ? "text-accent-ink" : "text-fg-subtle")}>{String(index + 1).padStart(2, "0")}</span>
                  <div className="relative min-w-0 flex-1">
                    <input
                      ref={index === links.length - 1 ? lastInput : undefined}
                      value={link}
                      onChange={(e) => update(index, e.target.value)}
                      onBlur={() => setTouched((current) => current.map((t, i) => (i === index ? true : t)))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && index === links.length - 1 && links.length < MAX && !ready) {
                          e.preventDefault();
                          add();
                        }
                      }}
                      placeholder={PLACEHOLDERS[kind][index]}
                      aria-label={`Link ${index + 1}`}
                      aria-invalid={Boolean(showError) || undefined}
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      className={cn(
                        "h-12 w-full rounded-full border bg-surface pl-5 text-[15px] transition-[border-color] duration-150 placeholder:text-fg-subtle hover:border-border-strong focus-visible:border-accent focus-visible:outline-none",
                        index === 0 ? "pr-20" : "pr-5",
                        showError ? "border-danger" : "border-border",
                      )}
                    />
                    {index === 0 && (
                      <span title="Values in tokens.json start from the first link" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wide text-fg-muted">
                        Base
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={links.length <= MIN}
                    aria-label={`Remove link ${index + 1}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-[color,background-color,opacity] duration-150 hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-0"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {showError && <p className="mt-1.5 pl-8 text-[12.5px] text-danger">{check.message}</p>}
              </li>
            );
          })}
        </ol>
        {links.length < MAX && (
          <button
            type="button"
            onClick={add}
            className="ml-8 mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border-strong px-4 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:border-accent hover:text-fg"
          >
            <Plus className="size-3.5" strokeWidth={2.25} /> Add a link
          </button>
        )}
      </div>

      <div className="mt-9 flex flex-col-reverse items-stretch justify-between gap-4 border-t border-dashed border-border pt-6 sm:flex-row sm:items-center">
        <p className="min-w-0 text-[13px] text-fg-muted">
          Becomes <span className="font-semibold text-fg">{preview}</span>
          {kind === "site" ? (filled.length ? ` · ${filled.length} pages` : "") : hosts.length ? ` · ${hosts.length} ${hosts.length === 1 ? "site" : "sites"}` : ""}
        </p>
        <Button type="submit" disabled={!ready} className="h-11 px-6">
          Build Kit <ArrowRight />
        </Button>
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-fg-subtle">
        Each new link counts as one build toward the hourly limit; links already in the library are free.{" "}
        <Link href="/how-it-works" className="underline decoration-border-strong underline-offset-4 hover:text-fg">
          How kits are measured
        </Link>
      </p>
    </form>
  );
}
