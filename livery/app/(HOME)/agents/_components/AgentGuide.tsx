"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { cn } from "@/lib/utils";

type Step = { text: string; code?: string };
type Agent = { id: string; name: string; tagline: string; steps: Step[]; note: string };

const SLUG = "<kit>";

const AGENTS: Agent[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    tagline: "One paste. It installs the kit as a skill and runs it.",
    steps: [
      { text: "Open any kit page and copy its install prompt. It pins the version and its sha256." },
      { text: "Paste it into Claude Code in your project. Claude downloads the kit, checks the hash and installs it here:", code: `.claude/skills/livery-${SLUG}/` },
      { text: "Claude audits your project, reports the gap and asks which areas to apply before it edits anything." },
      { text: "To keep a kit for every project, install it in your home folder instead:", code: `~/.claude/skills/livery-${SLUG}/` },
    ],
    note: "Claude loads the skill only when you ask to apply this kit or this site's design.",
  },
  {
    id: "codex",
    name: "Codex",
    tagline: "Unzip the kit, then point AGENTS.md at it.",
    steps: [
      { text: "Download kit.zip from the kit page and unzip it into your project:", code: `mkdir -p .livery/${SLUG} && unzip kit.zip -d .livery/${SLUG}` },
      { text: "Add one line to AGENTS.md so Codex knows where the kit lives:", code: `When I ask to apply the ${SLUG} design kit, read .livery/${SLUG}/SKILL.md and follow it.` },
      { text: "Ask Codex to apply the kit. It follows the same audit, ask and commit steps." },
    ],
    note: "SKILL.md is plain Markdown; nothing in it is specific to one agent.",
  },
  {
    id: "cursor",
    name: "Cursor",
    tagline: "Unzip the kit and hand SKILL.md to the agent.",
    steps: [
      { text: "Unzip kit.zip into your project:", code: `mkdir -p .livery/${SLUG} && unzip kit.zip -d .livery/${SLUG}` },
      { text: "In Agent mode, ask:", code: `Read .livery/${SLUG}/SKILL.md and follow it on this project.` },
      { text: "Optionally save that sentence as a project rule so future chats keep the design." },
    ],
    note: "Every step that edits files waits for your answers first.",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    tagline: "Same files, same flow, through Cascade.",
    steps: [
      { text: "Unzip kit.zip into your project:", code: `mkdir -p .livery/${SLUG} && unzip kit.zip -d .livery/${SLUG}` },
      { text: "Ask Cascade:", code: `Read .livery/${SLUG}/SKILL.md and follow it on this project.` },
    ],
    note: "Cascade commits one area at a time, as the kit asks.",
  },
  {
    id: "claude-ai",
    name: "claude.ai",
    tagline: "Upload the kit as a skill in the app.",
    steps: [
      { text: "Download kit.zip from the kit page." },
      { text: "In claude.ai, open your skills settings and upload the zip." },
      { text: "Ask Claude to apply the kit. In chat it can plan and draft changes; to edit your files, use an agent that works in your project." },
    ],
    note: "The zip holds the same files the agents use.",
  },
];

export function AgentGuide() {
  const [active, setActive] = useState(0);
  const agent = AGENTS[active];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div role="tablist" aria-label="Agents" aria-orientation="vertical" className="relative flex gap-1 overflow-x-auto lg:flex-col">
        <span
          aria-hidden
          className="absolute left-0 hidden w-full rounded-[14px] border border-border bg-surface shadow-card transition-[top] duration-300 ease-out-soft lg:block"
          style={{ top: active * 76, height: 72 }}
        />
        {AGENTS.map((a, i) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "relative z-10 flex shrink-0 flex-col items-start justify-center rounded-[14px] px-4 text-left transition-colors duration-150 lg:h-[72px] lg:mb-1",
              "max-lg:h-11 max-lg:border max-lg:border-border",
              i === active ? "text-fg max-lg:bg-surface" : "text-fg-muted hover:text-fg",
            )}
          >
            <span className="text-[15px] font-semibold tracking-tight">{a.name}</span>
            <span className="hidden truncate text-xs text-fg-subtle lg:block lg:max-w-[14rem]">{a.tagline}</span>
          </button>
        ))}
      </div>

      <div key={agent.id} role="tabpanel" className="animate-rise min-w-0 rounded-[18px] border border-border bg-surface p-6 shadow-card sm:p-8">
        <p className="label-micro">{agent.name}</p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight">{agent.tagline}</h3>
        <ol className="mt-6 space-y-5">
          {agent.steps.map((step, i) => (
            <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
              <span className="flex size-7 items-center justify-center rounded-full border border-border font-mono text-xs text-fg-muted tabular">{i + 1}</span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm leading-relaxed text-fg-muted">{step.text}</p>
                {step.code && (
                  <div className="mt-2.5 flex items-center gap-2 rounded-[10px] border border-border bg-bg py-1.5 pl-3.5 pr-1.5">
                    <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-fg">{step.code}</code>
                    <CopyButton value={step.code} variant="ghost" size="icon-sm" label="Copy" />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-7 border-t border-dashed border-border pt-4 text-[13px] text-fg-subtle">{agent.note} Replace {SLUG} with the kit&apos;s name, for example goatrank-lol.</p>
      </div>
    </div>
  );
}
