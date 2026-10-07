import { SectionHeading } from "@/components/SectionHeading";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const QUESTIONS = [
  {
    q: "Does Livery copy the website?",
    a: "No. It measures the design (colours, type, spacing, radii, motion) and writes the reasoning behind it. Logos, photos, illustrations, fonts and the site's own words are never copied; they are described as style only.",
  },
  {
    q: "Which agents does it work with?",
    a: "Claude Code installs a kit in one step with the copy-paste prompt. Codex, Cursor and any agent that can read Markdown can use the same files: unzip the kit and point the agent at SKILL.md.",
  },
  {
    q: "Will it change my code without asking?",
    a: "Never. The first rule in every kit is to edit nothing before step 5. Your agent audits, reports the gap, asks which areas to apply and resolves conflicts with your project rules first. Each area lands as its own commit.",
  },
  {
    q: "What about paid fonts and icon sets?",
    a: "Every item is labelled. Paid fonts and icons are marked as needing a licence and always come with a free alternative. Your agent only installs the paid one if you confirm you hold a licence.",
  },
  {
    q: "Why couldn't Livery read a site?",
    a: "Some sites block automated browsers, need a sign-in, or are login, payment or banking pages. Livery doesn't work around any of that. It tells you why and what you can do instead.",
  },
  {
    q: "Is it free?",
    a: "Yes. Building and installing kits is free. New builds are rate limited per visitor; kits already in the library are always free to install.",
  },
];

export function Faq() {
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20">
        <SectionHeading kicker="Questions" numbered title="The Short Answers" />
        <Accordion type="single" collapsible className="rounded-[18px] border border-border bg-surface px-5 sm:px-7 shadow-card">
          {QUESTIONS.map(({ q, a }) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
