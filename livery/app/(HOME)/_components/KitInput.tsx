"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyReturn } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { SITE } from "@/constants/constants";
import { EXAMPLE_SITES } from "@/constants/options";
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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!result.ok) {
      setShowError(true);
      inputRef.current?.focus();
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
            "group flex flex-col gap-2 rounded-[20px] border bg-surface p-2 transition-[border-color] duration-200 sm:flex-row sm:items-center",
            invalid ? "border-danger" : "border-border-strong focus-within:border-accent hover:border-fg-subtle/50",
          )}
        >
          <div className="relative flex h-12 min-w-0 flex-1 items-center pl-3 text-[17px] sm:h-14 sm:pl-4 sm:text-lg">
            <span aria-hidden className="shrink-0 font-medium text-fg-subtle select-none">
              {SITE.domain}/
            </span>
            <div className="relative min-w-0 flex-1">
              <input
                ref={inputRef}
                id={inputId}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (showError) setShowError(false);
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
                className="h-full w-full bg-transparent pr-2 font-medium text-fg outline-none focus-visible:outline-none"
              />
              {!value && (
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center font-medium text-fg-subtle/70">
                  {focused ? "paste any website" : placeholder}
                  <span className="ml-px inline-block h-[1.1em] w-[2px] translate-y-px rounded-full bg-accent animate-caret" />
                </span>
              )}
            </div>
            {result.ok && (
              <span className="hidden shrink-0 items-center gap-1 pr-2 text-xs text-fg-subtle sm:inline-flex">
                <KeyReturn className="size-3.5" /> to build
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
              className="hidden size-12 rounded-[14px] sm:inline-flex sm:size-14"
            />
            <Button type="submit" size="lg" className="group/build h-12 w-full rounded-[14px] sm:h-14 sm:w-auto sm:px-6">
              Build kit
              <ArrowRight weight="bold" className="transition-transform duration-200 ease-out-soft group-hover/build:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </form>

      <div className={cn("mt-4 flex min-h-6 flex-wrap items-center gap-x-1.5 gap-y-2", compact ? "justify-start" : "justify-center")}>
        {invalid ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            That doesn&apos;t look like a public website address. Try something like linear.app.
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
                    ? "border-accent bg-accent-soft text-accent-soft-fg"
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
    <div className="mx-auto mt-8 flex max-w-xl items-center gap-3 text-left rounded-xl border border-border bg-surface-2 py-1.5 pl-4 pr-1.5">
      <span className="label-micro hidden shrink-0 sm:inline">Agents</span>
      <span aria-hidden className="hidden h-4 w-px bg-border-strong sm:inline-block" />
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg-muted">
        <span className="text-fg-subtle select-none">$ </span>
        curl -fsSL {SITE.domain}/
        <span className={path ? "text-accent" : "text-fg-subtle"}>{path || "<any-site>"}</span>
      </code>
      <CopyButton value={command} variant="ghost" size="icon-sm" label="Copy command" disabled={!path} />
    </div>
  );
}
