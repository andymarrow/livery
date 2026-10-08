import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { AgentsScene } from "@/components/iso/scenes";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@/components/icons";
import { AgentGuide } from "./_components/AgentGuide";

export const metadata: Metadata = {
  title: "Install in your agent",
  description: "How to install a Livery kit in Claude Code, Codex, Cursor, Windsurf and claude.ai.",
};

export default function AgentsPage() {
  return (
    <>
      <PageIntro
        art={<AgentsScene />}
        kicker="Agents"
        title="Install a Kit"
        muted="in Your Agent"
        lead="A kit is plain Markdown and JSON, so any coding agent can follow it. Claude Code installs it in one paste; the others take a minute."
      >
        <Button asChild variant="secondary">
          <Link href="/explore">
            Pick a Kit <ArrowRight />
          </Link>
        </Button>
      </PageIntro>
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[80rem]">
          <AgentGuide />
        </div>
      </section>
    </>
  );
}
