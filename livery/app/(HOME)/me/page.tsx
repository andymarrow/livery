import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { disconnectExtension } from "@/app/actions/disconnectExtension";
import { signOut } from "@/app/actions/signOut";
import { EmptyState } from "@/components/EmptyState";
import { KitCard } from "@/components/KitCard";
import { Bookmark, CircleCheck, LockKeyhole, Plus, Puzzle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { listKits } from "@/services/kitRead";
import { ownedKits } from "@/services/myKits";
import { createClient, currentUser } from "@/utils/supabase/server";
import { Avatar } from "../_components/AccountMenu";
import { DeleteAccount } from "./_components/DeleteAccount";

export const metadata: Metadata = { title: "My kits", robots: { index: false } };
export const dynamic = "force-dynamic";

const PROVIDER: Record<string, string> = { google: "Google", github: "GitHub", email: "Email" };

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/me");
  const { password } = await searchParams;
  const supabase = await createClient();
  const [{ data: profile }, { data: saved }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
    supabase.from("saved_kits").select("kit_id, created_at").order("created_at", { ascending: false }),
  ]);
  const mine = await ownedKits(user.id).catch(() => []);
  const { data: tokens } = await supabase.from("extension_tokens").select("id, label, created_at, last_used_at, expires_at, revoked_at").order("created_at", { ascending: false });
  const connections = (tokens ?? []).filter((t) => !t.revoked_at && new Date(t.expires_at) > new Date());
  const savedIds = (saved ?? []).map((s) => s.kit_id);
  const savedCards = savedIds.length ? (await listKits({ kitIds: savedIds, limit: 60 }).catch(() => ({ cards: [] }))).cards : [];
  const order = new Map(savedIds.map((id, i) => [id, i]));
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "You";
  const providers = [...new Set((user.identities ?? []).map((i) => PROVIDER[i.provider] ?? i.provider))];

  return (
    <div className="mx-auto w-full max-w-[80rem] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      {password === "updated" && (
        <p role="status" className="mb-8 flex items-center gap-2 rounded-[14px] bg-accent-soft px-4 py-3 text-sm text-accent-soft-fg">
          <CircleCheck className="size-4" /> Your password is updated.
        </p>
      )}

      <header className="flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end">
        <div className="flex items-center gap-4">
          <Avatar name={name} url={profile?.avatar_url} className="size-16 text-xl" />
          <div className="min-w-0">
            <p className="label-micro">Your account</p>
            <h1 className="mt-1.5 truncate text-3xl font-bold tracking-tight">{name}</h1>
            <p className="mt-1 truncate text-sm text-fg-muted">
              {user.email}
              {providers.length > 0 && <span className="text-fg-subtle"> · signed in with {providers.join(" and ")}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/create">
              <Plus /> Create a kit
            </Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Your Kits</h2>
        <p className="mt-1 text-sm text-fg-muted">Kits you build while signed in, including private ones made with the browser extension.</p>
        <div className="mt-5">
          {mine.length ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((kit) => (
                <li key={kit.slug}>
                  <Link href={`/me/kits/${kit.slug}/v${kit.version}`} className="group flex gap-3.5 rounded-[18px] border border-border bg-surface p-3 shadow-card transition-[border-color,transform] duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-border-strong">
                    <span className="h-16 w-24 shrink-0 overflow-hidden rounded-[10px] border border-border bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed or public storage URL */}
                      {kit.preview && <img src={kit.preview} alt="" className="h-full w-full object-cover object-top" />}
                    </span>
                    <span className="min-w-0 flex-1 py-0.5">
                      <span className="block truncate text-[14.5px] font-semibold tracking-tight">{kit.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                        <span className={kit.visibility === "private" ? "inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 font-medium text-fg-muted" : "rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-soft-fg"}>
                          {kit.visibility === "private" ? <><LockKeyhole className="size-3" /> Private</> : "Public"}
                        </span>
                        {kit.status === "withdrawn" && <span className="rounded-full bg-danger-soft px-2 py-0.5 font-medium text-danger">Withdrawn</span>}
                        <span className="font-mono text-fg-subtle">v{kit.version}{kit.versions > 1 ? ` · ${kit.versions} versions` : ""}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Plus />}
              title="Nothing Built Yet"
              description="Kits you create while signed in will be listed here, ready to update, publish or share."
              action={
                <Button asChild variant="secondary">
                  <Link href="/create">Create a kit</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      <section id="saved" className="mt-14 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">Saved</h2>
        <p className="mt-1 text-sm text-fg-muted">Kits you saved from the library.</p>
        <div className="mt-5">
          {savedCards.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...savedCards].sort((a, b) => (order.get(a.kitId) ?? 0) - (order.get(b.kitId) ?? 0)).map((kit) => (
                <KitCard key={kit.slug} kit={kit} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Bookmark />}
              title="No Saved Kits Yet"
              description="Press Save on any kit's page and it will wait for you here."
              action={
                <Button asChild variant="secondary">
                  <Link href="/explore">Explore the library</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      <section id="extension" className="mt-14 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">Browser Extension</h2>
        <p className="mt-1 text-sm text-fg-muted">Add pages you can only see when signed in (dashboards, settings) to your kits. They stay private until you publish them.</p>
        <div className="mt-5 rounded-[18px] border border-border bg-surface shadow-card">
          {connections.length ? (
            <ul>
              {connections.map((c) => (
                <li key={c.id} className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-accent-ink">
                    <Puzzle className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{c.label}</span>
                    <span className="block text-[12px] text-fg-subtle">
                      Connected {c.created_at.slice(0, 10)}
                      {c.last_used_at ? ` · last used ${c.last_used_at.slice(0, 10)}` : " · not used yet"}
                    </span>
                  </span>
                  <form action={disconnectExtension.bind(null, c.id)}>
                    <Button type="submit" variant="ghost" size="sm">
                      Disconnect
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-fg-muted">No browser connected yet.</p>
          )}
          <div className="border-t border-border px-5 py-3.5">
            <Link href="/extension/connect" className="text-[13.5px] font-medium text-accent-ink underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
              Connect a browser
            </Link>
          </div>
        </div>
      </section>

      <DeleteAccount privateKits={mine.filter((k) => k.visibility === "private").length} />
    </div>
  );
}
