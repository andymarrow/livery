"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/constants/options";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";
import { TasteCounter } from "./TasteCounter";

type Pill = { left: number; width: number; visible: boolean };

// Logo left, links centred in a capsule, actions right. At the top it sits
// flat on the page; once the page scrolls it slims, turns translucent with a
// blur, and a 1px accent line along the bottom shows how far down you are.
// Inside the capsule a pill glides to the link you point at and rests on the
// current page.
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
        "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300",
        scrolled ? "border-border bg-bg/75 backdrop-blur-xl backdrop-saturate-150" : "border-transparent bg-bg",
      )}
      style={{ viewTransitionName: "site-header" }}
    >
      <div
        className={cn(
          "mx-auto grid max-w-[80rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 transition-[height] duration-300 ease-out-soft sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
          scrolled ? "h-14" : "h-[4.5rem]",
        )}
      >
        <Logo className="justify-self-start" />

        <nav aria-label="Main" className="hidden lg:block" onPointerLeave={() => setHovered(null)}>
          <ul className="relative flex items-center gap-0.5 rounded-full border border-border bg-surface/70 p-1">
            <li
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-1 rounded-full bg-surface-3 transition-[left,width,opacity] duration-300 ease-out-soft",
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
                      "relative inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
                      active ? "text-fg" : "text-fg-muted hover:text-fg",
                    )}
                  >
                    {active && <span aria-hidden className="mr-1.5 size-1.5 rounded-full bg-accent" />}
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5 justify-self-end">
          <TasteCounter />
          <ThemeToggle />
          <Button asChild size="sm" className="group/create h-9 gap-1.5 pl-3 pr-4 text-sm">
            <Link href="/create" aria-current={pathname === "/create" ? "page" : undefined}>
              <Plus strokeWidth={2.5} className="transition-transform duration-300 ease-out-soft group-hover/create:rotate-90" />
              Create
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
