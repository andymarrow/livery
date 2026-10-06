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
        "sticky top-0 z-40 border-b bg-bg transition-[border-color] duration-200",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
        <Logo className="justify-self-start" />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
            {NAV_LINKS.map((link) => {
              const active = !link.href.includes("#") && pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150",
                      active ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5 justify-self-end">
          <ThemeToggle />
          <Button asChild size="sm" variant="inverse" className="hidden rounded-full px-3.5 sm:inline-flex">
            <Link href="/#get-a-kit">
              Get a kit
              <ArrowUpRight />
            </Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
