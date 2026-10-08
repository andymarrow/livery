import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { AgentsScene } from "@/components/iso/scenes";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@/components/icons";
import { AgentGuide } from "./_components/AgentGuide";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbs } from "@/lib/seo/schema";

export const metadata: Metadata = pageMetadata({
  title: "Install a Design Kit in Claude Code, Cursor, Codex or Windsurf",
  description: "Step-by-step: install a Livery design kit as a Claude Code skill in one paste, or use it in Cursor, Codex, Windsurf and claude.ai with the same files.",
  path: "/agents",
  kicker: "Agents",
});

export default function AgentsPage() {
  return (
    <>
      <JsonLd data={[breadcrumbs([{ name: "Install in your agent", path: "/agents" }]), {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to install a design kit in Claude Code",
            description: "Install a Livery design kit as a Claude Code skill in one paste; Cursor, Codex and Windsurf use the same files.",
            step: [
              { "@type": "HowToStep", position: 1, name: "Copy the install prompt", text: "Open any kit page on livery.site and copy its install prompt. It pins the version and its sha256 hash." },
              { "@type": "HowToStep", position: 2, name: "Paste it into Claude Code", text: "Paste the prompt into Claude Code in your project. Claude downloads the kit, checks the hash and installs it under .claude/skills/." },
              { "@type": "HowToStep", position: 3, name: "Ask Claude to apply it", text: "Claude audits your project, reports the gap and asks which areas to apply before it edits anything." },
            ],
          }]} />
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
