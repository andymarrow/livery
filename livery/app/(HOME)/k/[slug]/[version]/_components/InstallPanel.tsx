"use client";

import { Download as DownloadSimple, Bot as Robot, Terminal } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function InstallPanel({ prompt, zipUrl, tarUrl, skillName, sha256 }: { prompt: string; zipUrl: string; tarUrl: string; skillName: string; sha256: string }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-border bg-surface">
      <Tabs defaultValue="prompt">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <TabsList>
            <TabsTrigger value="prompt">
              <Terminal strokeWidth={2.25} /> Claude Code
            </TabsTrigger>
            <TabsTrigger value="download">
              <DownloadSimple strokeWidth={2.25} /> Download
            </TabsTrigger>
            <TabsTrigger value="other">
              <Robot strokeWidth={2.25} /> Other agents
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="prompt" className="mt-0 p-4 sm:p-5">
          <p className="text-sm text-fg-muted">Paste this into Claude Code in your project. It downloads the kit, checks its hash and asks before changing anything.</p>
          <div className="relative mt-4 rounded-xl border border-border bg-bg">
            <pre className="max-h-80 overflow-auto p-4 pr-14 font-mono text-[12.5px] leading-[1.75] text-fg whitespace-pre-wrap" tabIndex={0}>
              {prompt}
            </pre>
            <div className="absolute right-2 top-2">
              <CopyButton value={prompt} variant="secondary" size="icon-sm" label="Copy prompt" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CopyButton value={prompt} variant="primary" size="lg" label="Copy install prompt" copiedLabel="Copied. Paste it into your agent" className="rounded-[14px]" />
            <span className="text-[12.5px] text-fg-subtle">Installs to .claude/skills/{skillName}</span>
          </div>
        </TabsContent>

        <TabsContent value="download" className="mt-0 p-4 sm:p-5">
          <p className="text-sm text-fg-muted">The same files, for any setup. Unzip into <code className="font-mono text-[12.5px] text-fg">.claude/skills/{skillName}/</code> for one project, or <code className="font-mono text-[12.5px] text-fg">~/.claude/skills/{skillName}/</code> for all of them.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <a href={zipUrl} download>
                <DownloadSimple strokeWidth={2.25} /> kit.zip
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href={tarUrl} download>
                <DownloadSimple strokeWidth={2.25} /> kit.tar.gz
              </a>
            </Button>
          </div>
          <p className="mt-4 break-all font-mono text-[11.5px] text-fg-subtle">sha256 (tar.gz) {sha256}</p>
        </TabsContent>

        <TabsContent value="other" className="mt-0 space-y-4 p-4 text-sm leading-relaxed text-fg-muted sm:p-5">
          <p>
            <span className="font-medium text-fg">Codex, Cursor and others.</span> Unzip the kit anywhere in your project and tell your agent: “Read SKILL.md in that folder and follow it.” It&apos;s plain Markdown and JSON any agent can follow.
          </p>
          <p>
            <span className="font-medium text-fg">claude.ai.</span> Upload kit.zip in your skills settings, then ask Claude to apply the kit. In chat it can describe and draft changes; to edit files, use an agent that works in your project.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
