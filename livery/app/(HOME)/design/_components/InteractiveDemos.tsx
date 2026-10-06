"use client";

import { Search as MagnifyingGlass } from "@/components/icons";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";

export function InteractiveDemos() {
  const toast = useToast();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="label-micro mb-4">Inputs</p>
        <div className="space-y-3">
          <Input placeholder="MagnifyingGlass kits" />
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input placeholder="With an icon" className="pl-10" />
          </div>
          <Input aria-invalid placeholder="Invalid state" defaultValue="not a url" />
          <Input disabled placeholder="Disabled" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="label-micro mb-4">Tabs</p>
        <Tabs defaultValue="skill">
          <TabsList>
            <TabsTrigger value="skill">SKILL.md</TabsTrigger>
            <TabsTrigger value="tokens">tokens.json</TabsTrigger>
            <TabsTrigger value="rules">rules.md</TabsTrigger>
          </TabsList>
          <TabsContent value="skill" className="text-sm text-fg-muted">The flow your agent follows, step by step.</TabsContent>
          <TabsContent value="tokens" className="text-sm text-fg-muted">Colours, type, spacing, radii and motion values.</TabsContent>
          <TabsContent value="rules" className="text-sm text-fg-muted">What the design never does, and why.</TabsContent>
        </Tabs>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="label-micro mb-4">Overlays</p>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Apply colours?</DialogTitle>
              <DialogDescription>
                Your palette is saturated blue on pure white. This kit is near-black on warm paper with one accent. That is a
                large change.
              </DialogDescription>
              <div className="mt-6 flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">Skip</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Apply colours</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
          <Tooltip content="Tooltips are solid, never glowing">
            <Button variant="secondary">Hover for tooltip</Button>
          </Tooltip>
          <Button
            variant="secondary"
            onClick={() => toast({ title: "Kit link copied", description: "Paste it into your agent.", tone: "success" })}
          >
            Show toast
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="label-micro mb-4">Theme</p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-fg-muted">System by default, saved per browser, no flash on load.</p>
          <ThemeSwitch />
        </div>
      </div>
    </div>
  );
}
