import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Info, BadgeCheck as SealCheck, ShieldCheck } from "lucide-react";
import { LicenceBadge } from "@/components/LicenceBadge";
import { Badge } from "@/components/ui/badge";
import { skillNameFor } from "@/lib/generate/flow";
import { LEVELS, type Level } from "@/lib/generate/levels";
import { installPrompt } from "@/lib/kit/prompt";
import { kitPath, kitUrl, parseVersion } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { frameUrls, getKitVersion, readKitFiles } from "@/services/kitRead";
import { DesignGlance } from "./_components/DesignGlance";
import { FilesPanel } from "./_components/FilesPanel";
import { InstallPanel } from "./_components/InstallPanel";

// Rendered once per version and cached; refreshed every 30 minutes (shorter
// than the 2h signed frame URLs) and immediately when a version is withdrawn.
export const dynamic = "force-static";
export const revalidate = 1800;
export async function generateStaticParams() {
  return [];
}

async function load(params: PageProps<"/k/[slug]/[version]">["params"]) {
  const { slug, version } = await params;
  const number = parseVersion(version);
  if (!number || !supabaseConfigured()) return null;
  return getKitVersion(slug, number);
}

export async function generateMetadata({ params }: PageProps<"/k/[slug]/[version]">): Promise<Metadata> {
  const view = await load(params);
  if (!view) return { title: "Kit not found" };
  return {
    title: `${view.domain} design kit · v${view.version}`,
    description: view.analysis?.summary ?? `An installable design kit built from ${view.domain}.`,
    alternates: { canonical: kitPath(view.slug, view.version) },
  };
}

export default async function KitPage({ params }: PageProps<"/k/[slug]/[version]">) {
  const view = await load(params);
  if (!view) notFound();

  const skillName = skillNameFor(view.slug);
  const withdrawn = view.status === "withdrawn";
  const [files, frames] = withdrawn ? [[], []] : await Promise.all([view.tarPath ? readKitFiles(view.tarPath) : [], frameUrls(view.versionId)]);
  const counts = {
    free: view.items.filter((i) => i.licence === "free" && i.kind !== "icon").length,
    licence_required: view.items.filter((i) => i.licence === "licence_required").length,
    style_only: view.items.filter((i) => i.licence === "style_only").length,
  };
  const prompt = installPrompt({ siteName: view.domain, slug: view.slug, version: view.version, sha256: view.contentHash, skillName });
  const path = new URL(view.sourceUrl).pathname;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-fg-subtle">
        <Link href="/explore" className="transition-colors hover:text-fg">Library</Link>
        <span aria-hidden>/</span>
        <span className="text-fg-muted">{view.domain}</span>
      </nav>

      <header className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">v{view.version}</Badge>
            {view.ownerApproved && !withdrawn && (
              <Badge variant="accent" title="Built under the site owner's livery.json">
                <ShieldCheck strokeWidth={2.25} /> Owner approved
              </Badge>
            )}
            {withdrawn ? <Badge variant="danger">Withdrawn</Badge> : <Badge variant="neutral"><SealCheck className="text-accent" /> Published {view.publishedAt.slice(0, 10)}</Badge>}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">{view.domain}</h1>
          <a href={view.sourceUrl} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-[14px] text-fg-muted transition-colors hover:text-fg">
            {path === "/" ? "Homepage" : path} <ArrowUpRight className="size-3.5" />
          </a>
          {view.analysis?.summary && <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-fg-muted text-pretty">{view.analysis.summary}</p>}
        </div>
        <dl className="grid shrink-0 grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border text-center">
          {(Object.entries(counts) as [keyof typeof counts, number][]).map(([licence, count]) => (
            <div key={licence} className="bg-surface px-5 py-3">
              <dt className="flex justify-center"><LicenceBadge licence={licence} compact /></dt>
              <dd className="tabular mt-1.5 text-xl font-semibold">{count}</dd>
            </div>
          ))}
        </dl>
      </header>

      {view.latestVersion > view.version && (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
          <Info className="size-4 shrink-0 text-accent" />
          A newer version of this kit exists.
          <Link href={kitPath(view.slug, view.latestVersion)} className="ml-auto font-medium text-accent hover:underline">Open v{view.latestVersion}</Link>
        </div>
      )}

      {withdrawn ? (
        <div className="mt-10 rounded-[22px] border border-border bg-surface p-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Withdrawn by the site owner</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-fg-muted">This version was withdrawn on {view.withdrawnAt?.slice(0, 10)}. Its files are no longer available.</p>
        </div>
      ) : (
        <>
          <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr]">
            <InstallPanel prompt={prompt} zipUrl={kitPath(view.slug, view.version) + "/kit.zip"} tarUrl={kitPath(view.slug, view.version) + "/kit.tar.gz"} skillName={skillName} sha256={view.contentHash} />
            <div className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
              <p className="label-micro">Levels in this kit</p>
              <ul className="mt-4 space-y-3">
                {(view.levels as Level[]).map((level) => (
                  <li key={level} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-semibold text-accent-soft-fg">{level}</span>
                    <span>
                      <span className="block text-[14px] font-medium">{LEVELS[level].name}</span>
                      <span className="block text-[13px] text-fg-muted">{LEVELS[level].description}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-dashed border-border pt-4 text-[12.5px] leading-relaxed text-fg-subtle">
                Agents fetch <span className="font-mono text-fg-muted">{kitUrl(view.slug, view.version, "SKILL.md").replace("https://", "")}</span>. This version never changes.
              </p>
            </div>
          </section>

          {view.tokens && (
            <section className="mt-14">
              <h2 className="mb-5 text-2xl font-semibold tracking-[-0.03em]">The design at a glance</h2>
              <DesignGlance tokens={view.tokens} />
            </section>
          )}

          {view.analysis && (
            <section className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-[22px] border border-border bg-surface p-5 sm:p-7">
                <p className="label-micro">Principles</p>
                <ul className="mt-4 space-y-5">
                  {view.analysis.principles.map((p) => (
                    <li key={p.title}>
                      <p className="text-[15px] font-semibold tracking-tight">{p.title}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">{p.rule}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[22px] border border-border bg-surface p-5 sm:p-7">
                <p className="label-micro">Never</p>
                <ul className="mt-4 space-y-4">
                  {view.analysis.never.map((n) => (
                    <li key={n.rule} className="border-l-2 border-border-strong pl-4">
                      <p className="text-[14.5px] font-medium">{n.rule}</p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{n.why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {frames.some((f) => f.url) && (
            <section className="mt-14">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">Reference frames</h2>
                <p className="text-[13px] text-fg-subtle">Images became flat blocks and text became bars. Layout, rhythm and colour stay.</p>
              </div>
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_16rem]">
                {frames.map((frame) =>
                  frame.url ? (
                    <div key={frame.name} className="overflow-hidden rounded-2xl border border-border bg-surface">
                      <div className="max-h-[36rem] overflow-y-auto">
                        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
                        <img
                          src={frame.url}
                          alt={`${frame.name} layout of ${view.domain} with content removed`}
                          width={view.frameSizes[frame.name]?.width}
                          height={view.frameSizes[frame.name]?.height}
                          loading="lazy"
                          decoding="async"
                          className="block h-auto w-full"
                        />
                      </div>
                      <p className="border-t border-border px-3 py-2 font-mono text-[11px] text-fg-subtle">{frame.name}</p>
                    </div>
                  ) : null,
                )}
              </div>
            </section>
          )}

          {files.length > 0 && (
            <section className="mt-14">
              <h2 className="mb-5 text-2xl font-semibold tracking-[-0.03em]">Every file in the kit</h2>
              <FilesPanel files={files} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
