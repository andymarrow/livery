"use client";

import { useState } from "react";
import { CircleUser, Flag, Globe, LockKeyhole, Puzzle, ServerCrash } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/services/moderation";

const KINDS: Record<ActivityItem["kind"], { label: string; icon: typeof Globe; tone: string }> = {
  signup: { label: "Sign-ups", icon: CircleUser, tone: "bg-accent-soft text-accent-soft-fg" },
  publish: { label: "Published", icon: Globe, tone: "bg-accent-soft text-accent-soft-fg" },
  private: { label: "Private versions", icon: LockKeyhole, tone: "bg-surface-2 text-fg-muted" },
  capture: { label: "Extension", icon: Puzzle, tone: "bg-surface-2 text-fg-muted" },
  takedown: { label: "Takedowns", icon: Flag, tone: "bg-danger-soft text-danger" },
  failed: { label: "Failures", icon: ServerCrash, tone: "bg-danger-soft text-danger" },
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const time = (iso: string) => new Date(iso).toISOString().slice(11, 16);

// Everything that happened, grouped by day, filterable by kind.
export function ActivityFeed({ items, compact = false }: { items: ActivityItem[]; compact?: boolean }) {
  const [only, setOnly] = useState<ActivityItem["kind"] | null>(null);
  const shown = items.filter((i) => !only || i.kind === only);
  const groups = shown.reduce<{ day: string; items: ActivityItem[] }[]>((acc, item) => {
    const d = day(item.at);
    if (acc.at(-1)?.day === d) acc.at(-1)!.items.push(item);
    else acc.push({ day: d, items: [item] });
    return acc;
  }, []);
  return (
    <div>
      {!compact && (
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter activity">
          <Chip active={!only} onClick={() => setOnly(null)}>Everything <span className="font-mono text-fg-subtle">{items.length}</span></Chip>
          {(Object.keys(KINDS) as ActivityItem["kind"][]).map((k) => {
            const n = items.filter((i) => i.kind === k).length;
            return n ? (
              <Chip key={k} active={only === k} onClick={() => setOnly(only === k ? null : k)}>
                {KINDS[k].label} <span className="font-mono text-fg-subtle">{n}</span>
              </Chip>
            ) : null;
          })}
        </div>
      )}
      {groups.length ? (
        <ol className="space-y-6">
          {groups.map((g) => (
            <li key={g.day}>
              <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wider text-fg-subtle">{g.day}</p>
              <ul className="overflow-hidden rounded-[14px] border border-border bg-surface">
                {g.items.map((item, i) => {
                  const K = KINDS[item.kind];
                  const body = (
                    <>
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px]", K.tone)}>
                        <K.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{item.title}</span>
                        <span className="block truncate text-[12px] text-fg-muted">{item.detail}</span>
                      </span>
                      <span className="font-mono text-[11.5px] text-fg-subtle">{time(item.at)}</span>
                    </>
                  );
                  return (
                    <li key={`${item.at}-${i}`} className="border-b border-border last:border-0">
                      {item.href ? (
                        <a href={item.href} target={item.href.startsWith("/k/") ? "_blank" : undefined} rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/50">
                          {body}
                        </a>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-[14px] border border-border bg-surface px-4 py-14 text-center text-sm text-fg-muted">Nothing in the last two weeks.</p>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors", active ? "border-fg bg-fg text-bg" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg")}>
      {children}
    </button>
  );
}
