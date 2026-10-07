"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/constants/options";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";

// Sticky, solid and flat. A hairline appears once the page scrolls under it.
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-bg transition-shadow duration-150",
        scrolled && "shadow-card",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Logo className="shrink-0" />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = !link.href.includes("#") && pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
                      active ? "bg-surface-3/60 font-semibold text-fg" : "text-fg-muted hover:bg-surface-3/60 hover:text-fg",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild size="sm" className="hidden h-9 px-4 text-sm sm:inline-flex">
            <Link href="/#get-a-kit">
              Get a Kit
              <ArrowUpRight />
            </Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
