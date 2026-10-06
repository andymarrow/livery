import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EXTRACTOR_VERSION } from "@/constants/constants";
import { screenTarget } from "@/controllers/readSite";
import { FailurePanel } from "@/components/FailurePanel";
import { kitPath } from "@/lib/kit/urls";
import { supabaseConfigured } from "@/lib/supabase/configured";
import { findReadyKit } from "@/services/kits";
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

  const ready = await findReadyKit(screened.value.sourceUrl, EXTRACTOR_VERSION);
  if (ready) redirect(kitPath(ready.slug, ready.version));

  return (
    <Shell>
      <Builder url={screened.value.sourceUrl} host={screened.value.domain + (screened.value.url.pathname === "/" ? "" : screened.value.url.pathname)} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center px-4 py-20 sm:px-6 sm:py-28">{children}</div>;
}
