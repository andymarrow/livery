import Link from "next/link";
import { ArrowRight, ArrowUpRight, Info, LockKeyhole, BadgeCheck as SealCheck, UserCheck } from "@/components/icons";
import { AddToTaste } from "@/components/AddToTaste";
import { ExtensionSteps } from "@/components/ExtensionSteps";
import { LicenceBadge } from "@/components/LicenceBadge";
import { Badge } from "@/components/ui/badge";
import { skillNameFor } from "@/lib/generate/flow";
import { LEVELS, type Level } from "@/lib/generate/levels";
import { installPrompt } from "@/lib/kit/prompt";
import { kitHome, kitPath, kitUrl } from "@/lib/kit/urls";
import { frameUrls, readKitFiles, type KitVersionView } from "@/services/kitRead";
import { getStats } from "@/services/stats";
import { DesignGlance } from "./DesignGlance";
import { FilesPanel } from "./FilesPanel";
import { FrameViewer } from "./FrameViewer";
import { InstallPanel } from "./InstallPanel";
import { KitStats } from "./KitStats";
import { PublishBar } from "./PublishBar";
import { SaveButton } from "./SaveButton";
import { SourceExplorer } from "./SourceExplorer";
import { VersionSwitcher } from "./VersionSwitcher";

// One kit version's page. "public" is the cached page everyone sees at
// /k/<slug>/v<n>; "owner" is the signed-in owner's view at /me/kits/…, which
// also shows private versions, their install key and the Publish bar.
export async function KitView({ view, mode }: { view: KitVersionView; mode: "public" | "owner" }) {
  const privateKey = mode === "owner" && view.visibility === "private" ? view.privateKey : null;
  const versionHref = (version: number) => (mode === "owner" ? `/me/kits/${view.slug}/v${version}` : version === view.latestVersion ? kitHome(view.slug) : kitPath(view.slug, version));
  const skillName = skillNameFor(view.slug);
  const withdrawn = view.status === "withdrawn";
  const [files, frames] = withdrawn ? [[], []] : await Promise.all([view.tarPath ? readKitFiles(view.tarPath) : [], frameUrls(view.versionId, view.frameSizes)]);
  const counts = {
    free: view.items.filter((i) => i.licence === "free" && i.kind !== "icon").length,
    licence_required: view.items.filter((i) => i.licence === "licence_required").length,
    style_only: view.items.filter((i) => i.licence === "style_only").length,
  };
  const stats = await getStats(view.kitId).catch(() => ({ views: 0, likes: 0, downloads: 0 }));
  const prompt = installPrompt({ siteName: view.title, slug: view.slug, version: view.version, sha256: view.contentHash, skillName, key: privateKey });
  const fileQuery = privateKey ? `?key=${privateKey}` : "";
  const shownVersions = mode === "owner" ? view.versions : view.versions.filter((v) => v.visibility === "public");
  // The newest version this viewer can open: the owner sees private ones too.
  const newest = mode === "owner" ? Math.max(...view.versions.map((v) => v.version), view.version) : view.latestVersion;

  return (
    <div className="mx-auto w-full max-w-[80rem] px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-fg-subtle">
        {mode === "owner" ? (
          <Link href="/me" className="transition-colors hover:text-fg">My kits</Link>
        ) : (
          <Link href="/explore" className="transition-colors hover:text-fg">Library</Link>
        )}
        <span aria-hidden>/</span>
        {view.kind === "taste" && (
          <>
            <Link href="/tastes" className="transition-colors hover:text-fg">Tastes</Link>
            <span aria-hidden>/</span>
          </>
        )}
        <span className="truncate text-fg-muted">{view.title}</span>
      </nav>

      <header className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <VersionSwitcher
              current={view.version}
              options={shownVersions.map((v) => ({ version: v.version, href: versionHref(v.version), publishedAt: v.publishedAt, private: v.visibility === "private", latest: v.version === newest }))}
            />
            {view.kind === "taste" && <Badge variant="neutral">Taste · {view.sources.length} sites</Badge>}
            {view.kind === "site" && <Badge variant="neutral">{view.sources.length} pages</Badge>}
            {view.ownerApproved && !withdrawn && (
              <Badge variant="accent" title="Built under the site owner's livery.json">
                <UserCheck /> Owner approved
              </Badge>
            )}
            {view.visibility === "private" && (
              <Badge variant="neutral" title="Only you can see this version">
                <LockKeyhole /> Private
              </Badge>
            )}
            {withdrawn ? <Badge variant="danger">Withdrawn</Badge> : <Badge variant="neutral"><SealCheck className="text-accent-ink" /> {view.visibility === "private" ? "Built" : "Published"} {view.publishedAt.slice(0, 10)}</Badge>}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{view.title}</h1>
          <KitOrigin view={view} />
          {!withdrawn && view.visibility === "public" && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <KitStats slug={view.slug} initial={stats} />
                <SaveButton kitId={view.kitId} />
              </div>
            </div>
          )}
          {view.analysis?.summary && <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted text-pretty">{view.analysis.summary}</p>}
        </div>
        <dl className="grid shrink-0 grid-cols-3 gap-px overflow-hidden rounded-[18px] border border-border bg-border text-center">
          {(Object.entries(counts) as [keyof typeof counts, number][]).map(([licence, count]) => (
            <div key={licence} className="bg-surface px-5 py-3">
              <dt className="flex justify-center"><LicenceBadge licence={licence} compact /></dt>
              <dd className="tabular mt-1.5 text-xl font-semibold">{count}</dd>
            </div>
          ))}
        </dl>
      </header>

      {mode === "owner" && view.visibility === "private" && !withdrawn && <PublishBar versionId={view.versionId} title={view.title} version={view.version} />}

      {newest > view.version && (
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-[18px] border border-accent/50 bg-accent-soft px-4 py-3 text-sm text-accent-soft-fg shadow-card">
          <Info className="size-4 shrink-0 text-accent-ink" />
          <span>
            You&apos;re looking at <span className="font-semibold">v{view.version}</span>, an earlier version. The latest is v{newest}.
          </span>
          <Link href={versionHref(newest)} className="ml-auto inline-flex h-8 items-center rounded-full bg-accent px-3.5 text-[13px] font-semibold text-on-accent transition-opacity hover:opacity-90">
            Open v{newest}
          </Link>
        </div>
      )}

      {!withdrawn && view.kind !== "page" && view.sources.length > 0 && (
        <section id="sources" className="mt-10 scroll-mt-24">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight">{view.kind === "taste" ? "The Sites Behind This Taste" : "The Pages Behind This Kit"}</h2>
            <p className="hidden text-[13px] text-fg-subtle sm:block">Open one to compare, without leaving this page.</p>
          </div>
          <SourceExplorer sources={view.sources} kind={view.kind} />
        </section>
      )}

      {withdrawn ? (
        <div className="mt-10 rounded-[18px] border border-border bg-surface p-8 text-center shadow-card">
          <h2 className="text-xl font-semibold tracking-tight">Withdrawn by the Site Owner</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">This version was withdrawn on {view.withdrawnAt?.slice(0, 10)}. Its files are no longer available.</p>
        </div>
      ) : (
        <>
          <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr]">
            <InstallPanel prompt={prompt} zipUrl={kitPath(view.slug, view.version) + "/kit.zip" + fileQuery} tarUrl={kitPath(view.slug, view.version) + "/kit.tar.gz" + fileQuery} skillName={skillName} sha256={view.contentHash} />
            <div className="rounded-[18px] border border-border bg-surface p-5 sm:p-6 shadow-card">
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
                {privateKey ? (
                  <>The install prompt carries this version&apos;s private key. Share it only with people you trust; anyone with it can install this version.</>
                ) : (
                  <>
                    Agents fetch <span className="font-mono text-fg-muted">{kitUrl(view.slug, view.version, "SKILL.md").replace("https://", "")}</span>. This version never changes.
                  </>
                )}
              </p>
            </div>
          </section>

          {view.tokens && (
            <section className="mt-14">
              <h2 className="mb-5 text-2xl font-semibold tracking-tight">The Design at a Glance</h2>
              <DesignGlance tokens={view.tokens} />
            </section>
          )}

          {view.analysis && (
            <section className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-[18px] border border-border bg-surface p-5 sm:p-7 shadow-card">
                <p className="label-micro">Principles</p>
                <ul className="mt-4 space-y-5">
                  {view.analysis.principles.map((p) => (
                    <li key={p.title}>
                      <p className="text-sm font-semibold tracking-tight">{p.title}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">{p.rule}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[18px] border border-border bg-surface p-5 sm:p-7 shadow-card">
                <p className="label-micro">Never</p>
                <ul className="mt-4 space-y-4">
                  {view.analysis.never.map((n) => (
                    <li key={n.rule} className="border-l-2 border-border-strong pl-4">
                      <p className="text-sm font-medium">{n.rule}</p>
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
                <h2 className="text-2xl font-semibold tracking-tight">Reference Frames</h2>
                <p className="text-[13px] text-fg-subtle">The site with its content removed: images are flat blocks, text is soft bars. Layout, rhythm and colour stay. Scroll inside each screen.</p>
              </div>
              <FrameViewer
                title={view.title}
                frames={frames.flatMap((f) => {
                  const size = view.frameSizes[f.file];
                  return f.url && size ? [{ name: f.name, url: f.url, width: size.width, height: size.height }] : [];
                })}
              />
            </section>
          )}

          {files.length > 0 && (
            <section className="mt-14">
              <h2 className="mb-5 text-2xl font-semibold tracking-tight">Every File in the Kit</h2>
              <FilesPanel files={files} />
            </section>
          )}

          {view.kind !== "taste" && (mode === "owner" ? (
            <section className="mt-14">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">Add Pages Behind a Login</h2>
                <p className="text-[13px] text-fg-subtle">Each page you measure makes the next private version of this kit.</p>
              </div>
              <ExtensionSteps kitTitle={view.title} />
            </section>
          ) : (
            <Link href="/extension" className="group mt-14 flex items-center gap-4 rounded-[18px] border border-border bg-surface p-5 shadow-card transition-colors hover:border-border-strong sm:p-6">
              <LockKeyhole className="size-5 shrink-0 text-accent-ink" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold tracking-tight">Using {view.title} yourself?</span>
                <span className="block text-[13px] text-fg-muted">Make your own private version with the pages behind your login, using the Livery browser extension.</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </>
      )}
    </div>
  );
}

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");
const pathOf = (url: string) => {
  const path = new URL(url).pathname;
  return path === "/" ? "Homepage" : path;
};

// Where a kit came from: the page it was measured on, or each link of a combined kit.
function KitOrigin({ view }: { view: KitVersionView }) {
  if (view.kind === "page" && view.sourceUrl) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <a href={view.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[14px] text-fg-muted transition-colors hover:text-fg">
          {pathOf(view.sourceUrl)} <ArrowUpRight className="size-3.5" />
        </a>
        <AddToTaste url={view.sourceUrl} label="Add to a taste" />
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px]">
      {view.kind === "taste" && view.curator && view.curatorSlug && (
        <Link href={`/explore?by=${view.curatorSlug}`} className="mr-1 text-fg-muted transition-colors hover:text-fg">
          Picked by <span className="font-medium text-fg underline decoration-border-strong underline-offset-4">{view.curator}</span>
        </Link>
      )}
      {view.sources.map((source, index) => (
        <a
          key={source.url}
          href={`#source-${index + 1}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          <span className="font-mono text-[10.5px] text-fg-subtle">{String(index + 1).padStart(2, "0")}</span>
          {view.kind === "site" ? pathOf(source.url) : hostOf(source.url)}
        </a>
      ))}
    </div>
  );
}
