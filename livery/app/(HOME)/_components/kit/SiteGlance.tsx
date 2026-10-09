import type { SiteProfile } from "@/lib/extract/process/siteProfile";
import { cn } from "@/lib/utils";

const CATEGORY: Record<string, string> = { framework: "Framework", builder: "Builder", css: "Styling", ui: "UI kit", motion: "Motion", scroll: "Scroll", "3d": "3D", fonts: "Fonts" };

// What the site seems to be built with, its 3D (if any), and its craft details.
export function SiteGlance({ site }: { site: SiteProfile | undefined }) {
  if (!site || (!site.stack.length && !site.details.length && !site.scene)) return null;
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="label-micro mb-3">Built with · best guess</p>
        {site.stack.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {site.stack.map((s) => (
              <li key={s.name} title={`${s.evidence} (${s.confidence})`} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]", s.confidence === "likely" ? "border-dashed border-border-strong text-fg-muted" : "border-border bg-surface-2 text-fg")}>
                <span className="font-mono text-[10px] uppercase tracking-wide text-fg-subtle">{CATEGORY[s.category] ?? s.category}</span>
                {s.name}
                {s.version && <span className="font-mono text-[10.5px] text-fg-subtle">{s.version}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-fg-muted">Nothing identifiable from the page.</p>
        )}
        {site.scene && (
          <div className="mt-4 rounded-[14px] border border-border bg-surface-2 p-3.5">
            <p className="text-[12.5px] font-medium">
              3D · {site.scene.engine ?? "canvas"}
              {site.scene.version ? ` ${site.scene.version}` : ""}
              {site.scene.renderer ? ` · ${site.scene.renderer}` : ""}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{site.scene.notes.slice(0, 2).join(" ")}</p>
            {site.scene.colors?.length ? (
              <div className="mt-2.5 flex items-center gap-1.5" aria-label="The scene's main colours">
                {site.scene.colors.map((c) => (
                  <span key={c} title={c} className="size-4 rounded-[5px] border border-border" style={{ background: c }} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      {site.details.length > 0 && (
        <div>
          <p className="label-micro mb-3">Details · {site.details.length}</p>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {site.details.map((d) => (
              <li key={d.title} className="min-w-0 border-l-2 border-border-strong pl-3">
                <p className="text-[13px] font-medium">{d.title}</p>
                <p className="line-clamp-2 text-[12px] leading-relaxed text-fg-muted" title={d.description}>
                  {d.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
