"use client";

import { useMemo, useState } from "react";
import { Check } from "@/components/icons";
import { CopyButton } from "@/components/CopyButton";
import { Input } from "@/components/ui/input";
import { LEVELS } from "@/lib/generate/levels";
import { cn } from "@/lib/utils";

const ASSETS = [
  { id: "illustrations", label: "Illustrations" },
  { id: "custom_icons", label: "Custom icons" },
  { id: "photos", label: "Photos" },
] as const;
const LICENCES = ["CC-BY-4.0", "CC0-1.0", "MIT", "All rights reserved"];

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-colors duration-150",
        on ? "border-accent bg-accent-soft text-accent-soft-fg" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
      )}
    >
      <span className={cn("flex size-4 items-center justify-center rounded-[5px] border transition-colors", on ? "border-accent bg-accent text-on-accent" : "border-border-strong")}>
        {on && <Check strokeWidth={2.25} className="size-2.5" />}
      </span>
      {children}
    </button>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-fg-subtle">{hint}</span>}
    </label>
  );
}

// Builds a valid livery.json as the owner ticks boxes. Nothing is sent anywhere.
export function OptInGenerator() {
  const [mode, setMode] = useState<"in" | "out">("in");
  const [levels, setLevels] = useState<number[]>([1, 2, 3, 4]);
  const [assets, setAssets] = useState<string[]>([]);
  const [quote, setQuote] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [licence, setLicence] = useState(LICENCES[0]);
  const [commercial, setCommercial] = useState(true);
  const [attribution, setAttribution] = useState("");
  const [rules, setRules] = useState("");

  const json = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const file = {
      $schema: "https://livery.site/schema/livery-v1.json",
      version: 1,
      owner: { name: name || "Your studio", contact: contact || "design@example.com" },
      allow: mode === "out" ? { levels: [] } : { levels: [...levels].sort(), assets, quote_text: quote },
      ...(mode === "in" ? { terms: { licence, commercial, ...(attribution ? { attribution } : {}) }, ...(rules ? { rules } : {}) } : {}),
      updated: today,
    };
    return JSON.stringify(file, null, 2);
  }, [mode, levels, assets, quote, name, contact, licence, commercial, attribution, rules]);

  const flip = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-6">
        <div role="radiogroup" aria-label="Opt in or out" className="inline-flex rounded-xl border border-border bg-surface-2 p-0.5">
          {(["in", "out"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn("h-8 rounded-[10px] px-4 text-[13px] font-medium transition-colors", mode === value ? "bg-surface text-fg shadow-[0_0_0_1px_var(--border)]" : "text-fg-muted hover:text-fg")}
            >
              {value === "in" ? "Opt in" : "Opt out"}
            </button>
          ))}
        </div>

        {mode === "out" ? (
          <p className="rounded-2xl border border-border bg-surface p-4 text-sm leading-relaxed text-fg-muted">
            An empty <code className="font-mono text-[12.5px] text-fg">levels</code> list means “don&apos;t build kits from this site”. New builds stop, and published versions are withdrawn.
          </p>
        ) : (
          <>
            <div>
              <p className="mb-2 text-[13px] font-medium">Levels</p>
              <div className="flex flex-wrap gap-2">
                {([1, 2, 3, 4, 5, 6] as const).map((level) => (
                  <Toggle key={level} on={levels.includes(level)} onClick={() => setLevels(flip(levels, level))}>
                    {level} · {LEVELS[level].name}
                  </Toggle>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium">Assets that may be copied as files</p>
              <div className="flex flex-wrap gap-2">
                {ASSETS.map((asset) => (
                  <Toggle key={asset.id} on={assets.includes(asset.id)} onClick={() => setAssets(flip(assets, asset.id))}>
                    {asset.label}
                  </Toggle>
                ))}
                <Toggle on={quote} onClick={() => setQuote(!quote)}>Quote real copy</Toggle>
              </div>
              <p className="mt-2 text-[12px] text-fg-subtle">There is no option for your logo, on purpose.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Owner name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your studio" />
              </Field>
              <Field label="Contact">
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="design@example.com" />
              </Field>
              <Field label="Licence">
                <select value={licence} onChange={(e) => setLicence(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg focus-visible:border-accent focus-visible:outline-none">
                  {LICENCES.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end pb-0.5">
                <Toggle on={commercial} onClick={() => setCommercial(!commercial)}>Commercial use allowed</Toggle>
              </div>
            </div>
            <Field label="Attribution (optional)" hint="Copied into every kit's licences.md.">
              <Input value={attribution} onChange={(e) => setAttribution(e.target.value)} placeholder="Design by Your Studio, example.com" />
            </Field>
            <Field label="Your design rules (optional)" hint="A Markdown document of your own rules. It becomes the kit's rules.md.">
              <Input value={rules} onChange={(e) => setRules(e.target.value)} placeholder="https://example.com/design-rules.md" />
            </Field>
          </>
        )}
      </div>

      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex h-11 items-center justify-between border-b border-border pl-4 pr-2">
            <span className="font-mono text-xs text-fg-muted">/.well-known/livery.json</span>
            <CopyButton value={json} variant="ghost" size="sm" />
          </div>
          <pre className="max-h-[30rem] overflow-auto p-4 font-mono text-[12.5px] leading-[1.7] text-fg" tabIndex={0}>
            {json}
          </pre>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-fg-subtle">
          Can&apos;t add files under /.well-known? Host it anywhere on the same host and add{" "}
          <code className="font-mono text-fg-muted">&lt;link rel=&quot;livery&quot; href=&quot;/livery.json&quot;&gt;</code> to your homepage&apos;s head.
        </p>
      </div>
    </div>
  );
}
