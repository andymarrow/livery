import { Check } from "@/components/icons";
import { SITE } from "@/constants/constants";
import { AskPreview } from "./AskPreview";

const STEPS = [
  {
    title: "Paste a link",
    body: "Put livery.site/ in front of any public website. Livery renders it at three screen sizes and reads its design: colours, type, spacing, icons, motion.",
    visual: <PastePreview />,
  },
  {
    title: "Install the kit",
    body: "Your agent downloads the kit, checks its hash, and saves it as a skill. Every file is visible on the kit page before you run anything.",
    visual: <InstallPreview />,
  },
  {
    title: "Your agent asks, then applies",
    body: "It audits your project, rates the gap for each area, and asks what to change. Approved areas land as separate commits you can revert one by one.",
    visual: <AskPreview />,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1fr] md:items-end">
          <div>
            <p className="label-micro">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.035em] text-balance sm:text-[44px]">
              From any link to your codebase.{" "}
              <span className="text-fg-subtle">Nothing changes until you say so.</span>
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-fg-muted md:justify-self-end">
            A kit is plain Markdown and JSON. It carries the reasons behind a design, not just its values, so your agent
            knows what to keep and what to never do.
          </p>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="group flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-2 transition-[border-color] duration-200 hover:border-border-strong"
            >
              <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2 p-5">
                {step.visual}
              </div>
              <div className="px-3 pb-4 pt-5">
                <span className="font-mono text-xs text-fg-subtle">0{index + 1}</span>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PastePreview() {
  return (
    <div className="w-full max-w-[17rem]">
      <div className="flex h-11 items-center rounded-xl border border-border-strong bg-surface px-3.5 text-[14px] font-medium">
        <span className="text-fg-muted">{SITE.domain}/</span>
        <span className="text-fg">example.com</span>
        <span className="ml-px h-4 w-[2px] rounded-full bg-accent animate-caret" />
      </div>
      <div className="mt-3 flex items-center gap-1.5 pl-1">
        {["#141412", "#f3f1ec", "#0f7c72", "#9a968c"].map((swatch) => (
          <span
            key={swatch}
            className="size-5 rounded-md border border-border transition-transform duration-300 ease-out-soft group-hover:-translate-y-0.5 [&:nth-child(2)]:delay-[40ms] [&:nth-child(3)]:delay-[80ms] [&:nth-child(4)]:delay-[120ms]"
            style={{ backgroundColor: swatch }}
          />
        ))}
        <span className="ml-1.5 text-xs text-fg-muted">Palette, type, spacing, icons</span>
      </div>
    </div>
  );
}

function InstallPreview() {
  const lines = [
    { prompt: true, text: "curl -fsSL …/k/example-com/v1/kit.tar.gz" },
    { done: true, text: "sha256 verified" },
    { done: true, text: ".claude/skills/livery-example-com" },
    { done: true, text: "SKILL.md · tokens.json · rules.md" },
  ];
  return (
    <div className="w-full max-w-[18rem] rounded-xl border border-border bg-surface p-3.5 font-mono text-[11.5px] leading-[1.9]">
      {lines.map((line) => (
        <div key={line.text} className="flex items-center gap-2 truncate">
          {line.prompt ? (
            <span className="text-fg-subtle">$</span>
          ) : (
            <Check className="size-3 shrink-0 text-accent" strokeWidth={2.25} />
          )}
          <span className={line.prompt ? "truncate text-fg" : "truncate text-fg-muted"}>{line.text}</span>
        </div>
      ))}
    </div>
  );
}
