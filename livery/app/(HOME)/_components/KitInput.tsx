"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, CornerDownLeft as KeyReturn } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { SITE } from "@/constants/constants";
import { EXAMPLE_SITES } from "@/constants/options";
import { useExistingKit } from "@/lib/kit/useExistingKit";
import { toShortcut } from "@/lib/url/shortcut";
import { cn } from "@/lib/utils";

// Types the example sites into the empty field, one character at a time.
function useTypedPlaceholder(words: readonly string[], active: boolean) {
  const [text, setText] = useState<string>(words[0]);

  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let word = 0;
    let length = words[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = words[word];
      length += deleting ? -1 : 1;
      setText(current.slice(0, length));
      let delay = deleting ? 38 : 72;
      if (!deleting && length === current.length) {
        deleting = true;
        delay = 1900;
      } else if (deleting && length === 0) {
        deleting = false;
        word = (word + 1) % words.length;
        delay = 280;
      }
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, 1900);
    return () => clearTimeout(timer);
  }, [words, active]);

  return text;
}

export function KitInput({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [showError, setShowError] = useState(false);

  const result = useMemo(() => toShortcut(value), [value]);
  const placeholder = useTypedPlaceholder(EXAMPLE_SITES, !value && !focused);
  const path = result.ok ? result.path : "";
  const shortcut = `https://${SITE.domain}/${path}`;
  const invalid = showError && !result.ok && result.reason === "invalid";
  const existing = useExistingKit(result.ok ? result.path : null);
  const [rejected, setRejected] = useState(false);
  const found = existing.state === "found" ? existing.path : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!result.ok) {
      setShowError(true);
      inputRef.current?.focus();
      return;
    }
    // Already in the library: nothing is built twice. Say so, and point at the kit.
    if (found) {
      setRejected(true);
      return;
    }
    router.push(`/build?url=${encodeURIComponent(result.path)}`);
  }

  function pick(site: string) {
    setValue(site);
    setShowError(false);
    inputRef.current?.focus();
  }

  return (
    <div id={compact ? undefined : "get-a-kit"} className="w-full scroll-mt-28">
      <form onSubmit={submit} noValidate>
        <label htmlFor={inputId} className="sr-only">
          Website address
        </label>
        <div
          className={cn(
            "group flex flex-col gap-2 rounded-[18px] border bg-surface p-2 transition-[border-color] duration-150 sm:flex-row sm:items-center",
            invalid ? "border-danger" : "border-border-strong focus-within:border-accent hover:border-fg-subtle/50",
          )}
        >
          <div
            className="relative flex h-12 min-w-0 flex-1 cursor-text items-center pl-3 text-[17px] sm:h-14 sm:pl-4 sm:text-lg"
            onMouseDown={(event) => {
              // The whole row is the field: a click beside the text still places the caret.
              if (event.target !== inputRef.current) {
                event.preventDefault();
                inputRef.current?.focus();
              }
            }}
          >
            <span aria-hidden className="shrink-0 font-medium text-fg-subtle select-none">
              {SITE.domain}/
            </span>
            <div className="relative h-full min-w-0 flex-1">
              <input
                ref={inputRef}
                id={inputId}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (showError) setShowError(false);
                  if (rejected) setRejected(false);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                inputMode="url"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? errorId : undefined}
                placeholder={focused ? "paste any website" : undefined}
                className="h-full w-full bg-transparent pr-2 font-medium text-fg caret-accent outline-none placeholder:text-fg-subtle/70 focus-visible:outline-none"
              />
              {/* The typed examples only play while the field is idle; once it has
                  focus, the real caret and a plain placeholder take over. */}
              {!value && !focused && (
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center font-medium text-fg-subtle">
                  {placeholder}
                  <span className="ml-px inline-block h-[1.1em] w-[2px] translate-y-px rounded-full bg-accent animate-caret" />
                </span>
              )}
            </div>
            {result.ok && (
              <span className={cn("hidden shrink-0 items-center gap-1 pr-2 text-xs sm:inline-flex", found ? "font-medium text-accent-ink" : "text-fg-subtle")}>
                {found ? (
                  <>
                    <BadgeCheck className="size-3.5" /> in the library
                  </>
                ) : (
                  <>
                    <KeyReturn className="size-3.5" /> to build
                  </>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CopyButton
              key={shortcut}
              value={shortcut}
              label="Copy kit link"
              copiedLabel="Link copied"
              variant="ghost"
              size="icon"
              disabled={!result.ok}
              className="hidden size-12 sm:inline-flex sm:size-14"
            />
            <Button type="submit" size="lg" className="group/build h-12 w-full rounded-[14px] sm:h-14 sm:w-auto sm:px-6">
              {found ? "Open Kit" : "Build Kit"}
              <ArrowRight strokeWidth={2.25} className="transition-transform duration-150 ease-out-soft group-hover/build:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </form>

      <div className={cn("mt-4 flex min-h-6 flex-wrap items-center gap-x-1.5 gap-y-2", "justify-start")}>
        {invalid ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            That doesn&apos;t look like a public website address. Try something like linear.app.
          </p>
        ) : found ? (
          <p role={rejected ? "alert" : "status"} className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", rejected ? "text-fg" : "text-fg-muted")}>
            <span className={cn("inline-flex items-center gap-1.5 font-medium", rejected && "animate-rise")}>
              <BadgeCheck className="size-4 text-accent-ink" />
              {rejected ? "Already submitted." : "Already in the library."}
            </span>
            <span>{path} has a kit, so there&apos;s nothing to build.</span>
            <Link href={found} className="font-medium text-accent-ink underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
              Open the kit
            </Link>
          </p>
        ) : (
          <>
            <span className="mr-1 text-sm text-fg-subtle">Try</span>
            {EXAMPLE_SITES.map((site) => (
              <button
                key={site}
                type="button"
                onClick={() => pick(site)}
                className={cn(
                  "h-7 rounded-full border px-3 text-[13px] font-medium transition-colors duration-150",
                  path === site
                    ? "border-accent bg-accent font-semibold text-on-accent"
                    : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
                )}
              >
                {site}
              </button>
            ))}
          </>
        )}
      </div>

      {!compact && <AgentLine path={path} />}
    </div>
  );
}

// What an agent would run. Updates as you type, so the shortcut idea is obvious.
function AgentLine({ path }: { path: string }) {
  const command = `curl -fsSL ${SITE.domain}/${path || "<any-site>"}`;
  return (
    <div className="mt-6 flex max-w-xl items-center gap-3 text-left rounded-[14px] border border-border bg-surface-2 py-1.5 pl-4 pr-1.5">
      <span className="label-micro hidden shrink-0 sm:inline">Agents</span>
      <span aria-hidden className="hidden h-4 w-px bg-border-strong sm:inline-block" />
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg-muted">
        <span className="text-fg-muted select-none">$ </span>
        curl -fsSL {SITE.domain}/
        <span className={path ? "text-accent-ink" : "text-fg-muted"}>{path || "<any-site>"}</span>
      </code>
      <CopyButton value={command} variant="ghost" size="icon-sm" label="Copy command" disabled={!path} />
    </div>
  );
}
