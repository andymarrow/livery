import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { SITE } from "@/constants/constants";
import { FOOTER_LINKS } from "@/constants/options";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{SITE.tagline}</p>
          </div>
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h2 className="label-micro">{group}</h2>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="relative text-sm text-fg-muted transition-colors duration-150 after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out-soft hover:text-fg hover:after:scale-x-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-dashed border-border pt-6">
          <Wordmark />
        </div>

        <div className="mt-6 flex flex-col-reverse items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-[13px] text-fg-subtle">
            © {new Date().getFullYear()} {SITE.name}. Style, never assets: we describe designs, we don&apos;t copy them.
          </p>
          <ThemeSwitch />
        </div>
      </div>
    </footer>
  );
}
