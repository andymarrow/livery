import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/signOut";
import { EmptyState } from "@/components/EmptyState";
import { KitCard } from "@/components/KitCard";
import { Bookmark, CircleCheck, Plus, Puzzle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { listKits } from "@/services/kitRead";
import { createClient, currentUser } from "@/utils/supabase/server";
import { Avatar } from "../_components/AccountMenu";

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
          <EmptyState
            icon={<Plus />}
            title="Nothing Built Yet"
            description="Kits you create from now on will be listed here, ready to update, publish or share."
            action={
              <Button asChild variant="secondary">
                <Link href="/create">Create a kit</Link>
              </Button>
            }
          />
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

      <section className="mt-14 flex flex-col gap-4 rounded-[18px] border border-dashed border-border-strong p-6 sm:flex-row sm:items-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-border bg-surface text-accent-ink">
          <Puzzle className="size-5" />
        </span>
        <div>
          <p className="font-semibold tracking-tight">The Browser Extension Is Coming</p>
          <p className="mt-1 text-sm text-fg-muted">Add pages you can only see when signed in (dashboards, settings) to your kits. They stay private until you publish them.</p>
        </div>
      </section>
    </div>
  );
}
