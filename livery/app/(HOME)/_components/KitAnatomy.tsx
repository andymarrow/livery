"use client";

import { useId, useState } from "react";
import { CodeFolder, fileIcon, Image as ImageIcon } from "@/components/icons";
import { CopyButton } from "@/components/CopyButton";
import { LIVERY_KIT, type KitFilePreview } from "@/data/liveryKit";
import { cn } from "@/lib/utils";

// Minimal highlighting: just enough tone to make JSON and Markdown scannable.
function Line({ text, kind }: { text: string; kind: KitFilePreview["kind"] }) {
  if (kind === "json") {
    const parts = text.split(/("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(-?\b\d+(?:\.\d+)?\b)/g).filter((p) => p !== undefined && p !== "");
    return (
      <>
        {parts.map((part, i) =>
          /^".*":$/.test(part.trim()) ? (
            <span key={i} className="text-fg-muted">{part}</span>
          ) : /^"#[0-9a-f]{3,8}"$/i.test(part) ? (
            <span key={i} className="text-accent">
              <span className="mr-1 inline-block size-2.5 translate-y-px rounded-[3px] border border-border" style={{ background: part.slice(1, -1) }} />
              {part}
            </span>
          ) : /^"/.test(part) ? (
            <span key={i} className="text-fg">{part}</span>
          ) : /^-?\d/.test(part) ? (
            <span key={i} className="text-accent">{part}</span>
          ) : (
            <span key={i} className="text-fg-subtle">{part}</span>
          ),
        )}
      </>
    );
  }
  if (/^#{1,3} /.test(text)) return <span className="font-semibold text-fg">{text}</span>;
  if (/^---$/.test(text)) return <span className="text-fg-subtle">{text}</span>;
  if (/^(name|description):/.test(text)) {
    const [key, ...rest] = text.split(":");
    return (
      <>
        <span className="text-accent">{key}:</span>
        <span className="text-fg-muted">{rest.join(":")}</span>
      </>
    );
  }
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);
  return (
    <span className="text-fg-muted">
      {parts.map((part, i) =>
        part.startsWith("**") ? (
          <span key={i} className="font-semibold text-fg">{part}</span>
        ) : part.startsWith("_") ? (
          <span key={i} className="italic text-fg">{part}</span>
        ) : part.startsWith("`") ? (
          <span key={i} className="text-accent">{part}</span>
        ) : (
          part
        ),
      )}
    </span>
  );
}


export function KitAnatomy() {
  const [active, setActive] = useState(0);
  const listId = useId();
  const file = LIVERY_KIT[active];
  const lines = file.content.split("\n");

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      setActive((i) => (i + 1) % LIVERY_KIT.length);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      setActive((i) => (i - 1 + LIVERY_KIT.length) % LIVERY_KIT.length);
    }
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-border bg-surface">
      <div className="flex h-12 items-center justify-between gap-4 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2.5 text-[13px]">
          <CodeFolder className="size-[18px] shrink-0 text-accent" />
          <span className="truncate font-mono text-fg-muted">.claude/skills/</span>
          <span className="-ml-2 truncate font-mono font-medium text-fg">livery-livery-site</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden font-mono text-[11px] text-fg-subtle sm:inline">sha256 verified</span>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-soft-fg">v1</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[15rem_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label="Kit files"
          aria-orientation="vertical"
          id={listId}
          onKeyDown={onKeyDown}
          className="flex min-w-0 gap-1 overflow-x-auto border-b border-border p-2 md:flex-col md:overflow-visible md:border-b-0 md:border-r"
        >
          {LIVERY_KIT.map((entry, index) => {
            const Icon = fileIcon(entry.path);
            const selected = index === active;
            return (
              <button
                key={entry.path}
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                className={cn(
                  "group relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors duration-150 md:py-2.5",
                  selected ? "bg-surface-2 text-fg" : "text-fg-muted hover:bg-surface-2/60 hover:text-fg",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent transition-opacity duration-200 md:block",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon className={cn("size-4 shrink-0", selected && "text-accent")} />
                <span className="min-w-0">
                  <span className="block font-mono text-[12.5px] font-medium">{entry.path}</span>
                  <span className="hidden truncate text-[11.5px] text-fg-subtle md:block">{entry.description}</span>
                </span>
              </button>
            );
          })}
          <div className="hidden items-center gap-2.5 px-3 py-2.5 text-fg-subtle md:flex">
            <ImageIcon className="size-4 shrink-0" />
            <span>
              <span className="block font-mono text-[12.5px]">frames/</span>
              <span className="block text-[11.5px]">Content-removed screenshots</span>
            </span>
          </div>
        </div>

        <div role="tabpanel" aria-labelledby={listId} className="relative min-w-0">
          <div className="absolute right-2 top-2 z-10">
            <CopyButton value={file.content} variant="ghost" size="icon-sm" label={`Copy ${file.path}`} />
          </div>
          <pre key={file.path} className="h-[26rem] animate-rise overflow-auto py-4 font-mono text-[12.5px] leading-[1.75]" tabIndex={0}>
            <code className="grid grid-cols-1">
              {lines.map((line, i) => (
                <span key={i} className="grid grid-cols-[3rem_1fr] pr-12">
                  <span aria-hidden className="select-none pr-4 text-right text-fg-subtle/60">{i + 1}</span>
                  <span className="whitespace-pre-wrap break-words">
                    <Line text={line} kind={file.kind} />
                  </span>
                </span>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
