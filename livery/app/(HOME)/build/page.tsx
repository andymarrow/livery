import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EXTRACTOR_VERSION } from "@/constants/constants";
import { screenTarget } from "@/controllers/readSite";
import { FailurePanel } from "@/components/FailurePanel";
import { kitPath } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { getKitVersion } from "@/services/kitRead";
import { findReadyKit } from "@/services/kits";
import { AlreadySubmitted } from "./_components/AlreadySubmitted";
import { Builder } from "./_components/Builder";

export const metadata: Metadata = { title: "Building a kit", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BuildPage({ searchParams }: PageProps<"/build">) {
  const { url } = await searchParams;
  const raw = typeof url === "string" ? url : "";
  if (!raw) redirect("/#get-a-kit");

  if (!supabaseConfigured()) {
    return (
      <Shell>
        <p className="text-center text-fg-muted">Livery isn&apos;t configured yet. Add the Supabase keys to the environment.</p>
      </Shell>
    );
  }

  const screened = await screenTarget(raw);
  if (!screened.ok) {
    const host = raw.replace(/^https?:\/*/, "").split("/")[0] || raw;
    return (
      <Shell>
        <FailurePanel reason={screened.reason} host={host} />
      </Shell>
    );
  }

  const grantHash = screened.value.grant.status === "granted" ? screened.value.grant.hash : null;
  const ready = await findReadyKit(screened.value.sourceUrl, EXTRACTOR_VERSION);
  if (ready && ready.grantHash === grantHash) {
    const view = await getKitVersion(ready.slug, ready.version);
    return (
      <Shell>
        <AlreadySubmitted
          path={kitPath(ready.slug, ready.version)}
          title={view?.title ?? screened.value.domain}
          page={screened.value.url.pathname}
          version={ready.version}
          publishedAt={ready.publishedAt}
          palette={view?.tokens?.palette ?? null}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <Builder url={screened.value.sourceUrl} host={screened.value.domain + (screened.value.url.pathname === "/" ? "" : screened.value.url.pathname)} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center px-4 py-16 sm:px-6 sm:py-20">{children}</div>;
}
