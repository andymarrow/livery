import type { NextRequest } from "next/server";
import { json, requireExtensionUser, unauthorized } from "@/lib/extension/http";
import { getAdminClient } from "@/lib/supabase/admin";
import { registrableDomain } from "@/lib/url/site";

export const dynamic = "force-dynamic";

type Target = { slug: string; title: string; kind: string; owned: boolean; visibility: "public" | "private"; version: number };

/**
 * Where the page the extension is on can be added: the user's kits for that
 * site, then public kits for it (adding to those makes a private copy).
 */
export async function GET(request: NextRequest) {
  const user = await requireExtensionUser(request);
  if (!user) return unauthorized();
  let host = "";
  try {
    host = new URL(request.nextUrl.searchParams.get("url") ?? "").hostname;
  } catch {
    return json({ error: "Send the page's url." }, 400);
  }
  const site = registrableDomain(host);
  if (!site) return json({ site: null, targets: [] });

  const db = getAdminClient();
  const { data } = await db
    .from("kits")
    .select("slug, kind, domain, owner_id, display_name, kit_versions(version, status, visibility)")
    .in("kind", ["page", "site"])
    .or(`domain.eq.${site},domain.like.%.${site}`)
    .limit(200);
  const targets: Target[] = [];
  for (const kit of data ?? []) {
    if (!kit.domain || registrableDomain(kit.domain) !== site) continue;
    const owned = kit.owner_id === user.userId;
    const versions = ((kit.kit_versions ?? []) as unknown as { version: number | null; status: string; visibility: "public" | "private" }[]).filter((v) => v.status === "ready" && v.version && (owned || v.visibility === "public"));
    const latest = versions.sort((a, b) => b.version! - a.version!)[0];
    if (!latest) continue;
    targets.push({ slug: kit.slug, title: kit.display_name ?? kit.domain, kind: kit.kind, owned, visibility: latest.visibility, version: latest.version! });
  }
  targets.sort((a, b) => Number(b.owned) - Number(a.owned) || a.title.localeCompare(b.title));
  return json({ site, targets: targets.slice(0, 30) });
}
