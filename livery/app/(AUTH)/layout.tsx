import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, LockKeyhole, Puzzle } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = { robots: { index: false, follow: true } };

const PERKS = [
  { icon: LockKeyhole, title: "Private kits", body: "Measure pages behind your login. They stay yours until you publish them." },
  { icon: Bookmark, title: "Your library", body: "Save kits you like and keep everything you built in one place." },
  { icon: Puzzle, title: "The browser extension", body: "Add your dashboard or settings pages to a kit, straight from your browser." },
];

// A quiet frame for signing in: the form, and on wide screens what an account adds.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 items-center gap-12 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20">
        <div className="mx-auto w-full max-w-[26rem]">{children}</div>
        <aside className="hidden border-l border-border pl-12 lg:block">
          <p className="label-micro">With an account</p>
          <ul className="mt-6 space-y-7">
            {PERKS.map((perk) => (
              <li key={perk.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-border bg-surface text-accent-ink">
                  <perk.icon className="size-[18px]" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold tracking-tight">{perk.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-fg-muted">{perk.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-[13px] text-fg-subtle">
            Building public kits never needs an account.{" "}
            <Link href="/" className="font-medium text-fg-muted underline decoration-border-strong underline-offset-4 hover:text-fg">
              Back to Livery
            </Link>
          </p>
        </aside>
      </main>
    </div>
  );
}
