"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/constants/options";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";

type Pill = { left: number; width: number; visible: boolean };

// A solid header that slims down once the page scrolls. A pill glides under
// the link you point at and rests on the current page; a 1px accent line
// along the bottom edge shows how far down the page you are.
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pill, setPill] = useState<Pill>({ left: 0, width: 0, visible: false });
  const [hovered, setHovered] = useState<number | null>(null);
  const items = useRef<(HTMLAnchorElement | null)[]>([]);

  const activeIndex = NAV_LINKS.findIndex((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 8);
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  // Measure the target link after layout so the pill lands exactly on it.
  // Links are measured against the list (their offset parent), and again
  // once the web font has loaded, since it changes their widths.
  useLayoutEffect(() => {
    const measure = () => {
      const index = hovered ?? (activeIndex >= 0 ? activeIndex : null);
      const el = index === null ? null : items.current[index];
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth, visible: true } : (p) => ({ ...p, visible: false }));
    };
    measure();
    let live = true;
    document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
    };
  }, [hovered, activeIndex]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-bg transition-[border-color,box-shadow] duration-300",
        scrolled ? "border-border shadow-card" : "border-transparent",
      )}
      style={{ viewTransitionName: "site-header" }}
    >
      <div className={cn("mx-auto flex max-w-[80rem] items-center gap-8 px-4 transition-[height] duration-300 ease-out-soft sm:px-6", scrolled ? "h-14" : "h-16")}>
        <Logo className="shrink-0" />

        <nav aria-label="Main" className="hidden md:block" onPointerLeave={() => setHovered(null)}>
          <ul className="relative flex items-center gap-0.5">
            <li
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 rounded-full bg-surface-3/70 transition-[left,width,opacity] duration-300 ease-out-soft",
                pill.visible ? "opacity-100" : "opacity-0",
              )}
              style={{ left: pill.left, width: pill.width }}
            />
            {NAV_LINKS.map((link, index) => {
              const active = index === activeIndex;
              return (
                <li key={link.href}>
                  <Link
                    ref={(el) => {
                      items.current[index] = el;
                    }}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onPointerEnter={() => setHovered(index)}
                    onFocus={() => setHovered(index)}
                    onBlur={() => setHovered(null)}
                    className={cn(
                      "relative inline-flex h-8 items-center rounded-full px-3.5 text-sm transition-colors duration-150",
                      active ? "font-semibold text-fg" : "font-medium text-fg-muted hover:text-fg",
                    )}
                  >
                    {link.label}
                    {active && <span aria-hidden className="absolute -bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" />}
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

      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-px h-px origin-left bg-accent transition-opacity duration-300"
        style={{ transform: `scaleX(${progress})`, opacity: scrolled ? 1 : 0 }}
      />
    </header>
  );
}
