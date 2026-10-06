import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Plus, Tray } from "@phosphor-icons/react/ssr";
import { CodeBlock } from "@/components/CodeBlock";
import { CopyButton } from "@/components/CopyButton";
import { EmptyState } from "@/components/EmptyState";
import { LicenceBadge } from "@/components/LicenceBadge";
import { Badge, LiveDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { InteractiveDemos } from "./_components/InteractiveDemos";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

const SWATCHES = [
  ["bg", "bg-bg"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["surface-3", "bg-surface-3"],
  ["border", "bg-border"],
  ["border-strong", "bg-border-strong"],
  ["fg", "bg-fg"],
  ["fg-muted", "bg-fg-muted"],
  ["fg-subtle", "bg-fg-subtle"],
  ["accent", "bg-accent"],
  ["accent-soft", "bg-accent-soft"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["danger", "bg-danger"],
] as const;

const TYPE_SCALE = [
  ["Display", "text-[56px] font-semibold leading-none tracking-[-0.045em]"],
  ["H1", "text-[44px] font-semibold leading-[1.05] tracking-[-0.035em]"],
  ["H2", "text-3xl font-semibold tracking-[-0.03em]"],
  ["H3", "text-lg font-semibold tracking-tight"],
  ["Body", "text-[15px] leading-relaxed text-fg-muted"],
  ["Small", "text-[13px] text-fg-muted"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-12">
      <h2 className="label-micro mb-6">{title}</h2>
      {children}
    </section>
  );
}

// Dev-only reference of every primitive, used to check both themes side by side.
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <p className="label-micro">Internal</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Design system</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fg-muted">
        Flat surfaces, hairline borders, one teal accent. No gradients, no coloured shadows, nothing floating. Toggle the
        theme to check every piece in both.
      </p>

      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {SWATCHES.map(([name, className]) => (
            <div key={name} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className={`h-14 border-b border-border ${className}`} />
              <p className="px-3 py-2 font-mono text-[11px] text-fg-muted">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="space-y-5">
          {TYPE_SCALE.map(([name, className]) => (
            <div key={name} className="grid grid-cols-1 items-baseline gap-2 sm:grid-cols-[120px_1fr]">
              <span className="font-mono text-xs text-fg-subtle">{name}</span>
              <p className={className}>Give your app a new livery</p>
            </div>
          ))}
          <div className="grid grid-cols-1 items-baseline gap-2 sm:grid-cols-[120px_1fr]">
            <span className="font-mono text-xs text-fg-subtle">Micro</span>
            <p className="label-micro">Total kits · this week</p>
          </div>
          <div className="grid grid-cols-1 items-baseline gap-2 sm:grid-cols-[120px_1fr]">
            <span className="font-mono text-xs text-fg-subtle">Mono</span>
            <p className="font-mono text-[13px]">sha256 3f9a…c21e</p>
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="inverse">
            Inverse <ArrowUpRight />
          </Button>
          <Button variant="soft">
            <Plus /> Soft
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="secondary" aria-label="Add">
            <Plus />
          </Button>
          <CopyButton value="https://livery.site/example.com" label="Copy link" />
          <CopyButton value="https://livery.site/example.com" size="icon" label="Copy link" />
        </div>
      </Section>

      <Section title="Badges and licence labels">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="muted">Muted</Badge>
          <Badge variant="accent">
            <LiveDot /> Building
          </Badge>
          <Badge variant="success">Ready</Badge>
          <Badge variant="warning">Retry later</Badge>
          <Badge variant="danger">Blocked</Badge>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <LicenceBadge licence="free" />
          <LicenceBadge licence="licence_required" />
          <LicenceBadge licence="style_only" />
          <LicenceBadge licence="free" compact />
          <LicenceBadge licence="licence_required" compact />
          <LicenceBadge licence="style_only" compact />
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>example.com</CardTitle>
                <CardDescription>v1 · 12 items · levels 1–3</CardDescription>
              </div>
              <Badge variant="success" size="sm">
                Ready
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1.5">
                {["bg-fg", "bg-bg", "bg-accent", "bg-fg-subtle", "bg-surface-3"].map((c) => (
                  <span key={c} className={`size-6 rounded-md border border-border ${c}`} />
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <span className="text-[13px] text-fg-subtle">Hanken Grotesk · Lucide</span>
            </CardFooter>
          </Card>
          <Card className="p-5">
            <p className="label-micro">Kits built</p>
            <p className="tabular mt-2 text-4xl font-semibold tracking-tight">1,284</p>
            <p className="mt-1 text-[13px] text-fg-subtle">Stat tile layout</p>
          </Card>
          <Card className="space-y-3 p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </Card>
        </div>
      </Section>

      <Section title="Interactive">
        <InteractiveDemos />
      </Section>

      <Section title="Code and empty states">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CodeBlock
            title="SKILL.md"
            language="markdown"
            code={`---\nname: livery-example-com\ndescription: Apply the example.com design kit.\n---\n\n# example.com design kit · v1\n\nNever edit a file before step 5. Ask, don't assume.`}
          />
          <EmptyState
            icon={<Tray />}
            title="No kits match"
            description="Try a different accent, font or icon set, or paste a site to build a new kit."
            action={<Button variant="secondary">Clear filters</Button>}
          />
        </div>
      </Section>
    </div>
  );
}
