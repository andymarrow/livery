import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ArrowRight, Check } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { SITE } from "@/constants/constants";
import { GUIDES, guideBySlug, type GuideBlock } from "@/lib/seo/guides";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbs } from "@/lib/seo/schema";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  const base = pageMetadata({ title: guide.title, description: guide.description, path: `/guides/${guide.slug}`, kicker: guide.kicker });
  return { ...base, openGraph: { ...base.openGraph, type: "article", publishedTime: guide.updated, modifiedTime: guide.updated } };
}

const anchor = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Block({ block }: { block: GuideBlock }) {
  if (typeof block === "string") return <p className="text-[16px] leading-[1.75] text-fg-muted">{block}</p>;
  if ("list" in block)
    return (
      <ul className="space-y-2.5">
        {block.list.map((item) => (
          <li key={item} className="flex gap-3 text-[15.5px] leading-relaxed text-fg-muted">
            <Check className="mt-1 size-4 shrink-0 text-accent-ink" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  if ("steps" in block)
    return (
      <ol className="space-y-3">
        {block.steps.map((item, i) => (
          <li key={item} className="flex gap-3.5 text-[15.5px] leading-relaxed text-fg-muted">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[11px] text-accent-ink">{i + 1}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    );
  if ("code" in block)
    return (
      <figure className="overflow-hidden rounded-[14px] border border-border bg-surface">
        {block.label && <figcaption className="border-b border-border px-4 py-2 font-mono text-[12px] text-fg-subtle">{block.label}</figcaption>}
        <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-[1.7] text-fg">{block.code}</pre>
      </figure>
    );
  return <p className="rounded-[14px] border border-border bg-surface-2 px-4 py-3 text-[14px] text-fg-muted">{block.note}</p>;
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const url = `${SITE.url}/guides/${guide.slug}`;
  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  return (
    <article className="px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: guide.title,
            description: guide.description,
            abstract: guide.answer,
            url,
            mainEntityOfPage: url,
            datePublished: guide.updated,
            dateModified: guide.updated,
            inLanguage: "en",
            timeRequired: `PT${guide.minutes}M`,
            image: `${SITE.url}/og?${new URLSearchParams({ title: guide.title, kicker: guide.kicker })}`,
            author: { "@id": `${SITE.url}/#organization` },
            publisher: { "@id": `${SITE.url}/#organization` },
            isPartOf: { "@id": `${SITE.url}/#website` },
          },
          breadcrumbs([
            { name: "Guides", path: "/guides" },
            { name: guide.title, path: `/guides/${guide.slug}` },
          ]),
        ]}
      />
      <div className="mx-auto max-w-[46rem]">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-fg-subtle">
          <Link href="/guides" className="transition-colors hover:text-fg">Guides</Link>
          <span aria-hidden>/</span>
          <span className="truncate text-fg-muted">{guide.kicker}</span>
        </nav>
        <h1 className="mt-6 text-3xl font-bold leading-[1.1] tracking-tight text-balance sm:text-5xl">{guide.title}</h1>
        <p className="mt-4 font-mono text-[12px] text-fg-subtle">
          Updated <time dateTime={guide.updated}>{guide.updated}</time> · {guide.minutes} min read
        </p>

        <section aria-label="The short answer" className="mt-8 rounded-[18px] border border-accent/40 bg-accent-soft p-5 text-accent-soft-fg sm:p-6">
          <p className="label-micro">The short answer</p>
          <p className="mt-2 text-[15.5px] leading-relaxed">{guide.answer}</p>
        </section>

        <nav aria-label="Contents" className="mt-8 border-l-2 border-border pl-4">
          <p className="label-micro">Contents</p>
          <ol className="mt-2 space-y-1">
            {guide.sections.map((s) => (
              <li key={s.heading}>
                <a href={`#${anchor(s.heading)}`} className="text-[14px] text-fg-muted transition-colors hover:text-fg">{s.heading}</a>
              </li>
            ))}
          </ol>
        </nav>

        {guide.sections.map((s) => (
          <section key={s.heading} id={anchor(s.heading)} className="mt-12 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">{s.heading}</h2>
            <div className="mt-4 space-y-5">
              {s.blocks.map((b, i) => (
                <Block key={i} block={b} />
              ))}
            </div>
          </section>
        ))}

        <section className="mt-14 flex flex-col gap-5 rounded-[18px] border border-border bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="text-lg font-semibold tracking-tight">Try it on a site you love</p>
            <p className="mt-1 text-sm text-fg-muted">Paste a link and get an installable design kit in about a minute. Free.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild>
              <Link href="/create">Create a kit <ArrowRight /></Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/explore">Browse kits</Link>
            </Button>
          </div>
        </section>

        <section className="mt-14">
          <p className="label-micro">More guides</p>
          <ul className="mt-4 space-y-3">
            {others.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="group flex items-baseline justify-between gap-4 border-b border-border pb-3 text-[15px] font-medium transition-colors hover:text-accent-ink">
                  {g.title}
                  <ArrowRight className="size-3.5 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
