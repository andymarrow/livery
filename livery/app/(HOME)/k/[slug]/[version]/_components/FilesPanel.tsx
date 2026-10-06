"use client";

import { BracketsCurly, FileText } from "@phosphor-icons/react";
import { CopyButton } from "@/components/CopyButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ORDER = ["SKILL.md", "rules.md", "tokens.json", "components.md", "layout.md", "motion.md", "voice.md", "fonts.json", "icons.json", "licences.md"];

// Nothing in a kit is hidden: every file is readable here before you install.
export function FilesPanel({ files }: { files: { path: string; text: string }[] }) {
  const sorted = [...files].sort((a, b) => ORDER.indexOf(a.path) - ORDER.indexOf(b.path));
  return (
    <Accordion type="multiple" defaultValue={["SKILL.md"]} className="rounded-[22px] border border-border bg-surface px-4 sm:px-6">
      {sorted.map((file) => {
        const Icon = file.path.endsWith(".json") ? BracketsCurly : FileText;
        return (
          <AccordionItem key={file.path} value={file.path}>
            <AccordionTrigger className="py-4">
              <span className="flex items-center gap-3">
                <Icon weight="duotone" className="size-4 text-accent" />
                <span className="font-mono text-[13px]">{file.path}</span>
                <span className="text-[12px] font-normal text-fg-subtle">{(file.text.length / 1024).toFixed(1)} KB</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pr-0">
              <div className="relative rounded-xl border border-border bg-bg">
                <pre className="max-h-[32rem] overflow-auto p-4 pr-14 font-mono text-[12px] leading-[1.7] text-fg whitespace-pre-wrap break-words" tabIndex={0}>
                  {file.text}
                </pre>
                <div className="absolute right-2 top-2">
                  <CopyButton value={file.text} variant="secondary" size="icon-sm" label={`Copy ${file.path}`} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
