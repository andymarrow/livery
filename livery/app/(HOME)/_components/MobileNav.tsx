"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_LINKS } from "@/constants/options";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <div className="flex h-16 items-center gap-2 px-5">
          <LogoMark />
          <SheetTitle className="text-[17px] font-semibold tracking-[-0.03em]">livery</SheetTitle>
        </div>
        <nav aria-label="Mobile" className="flex-1 px-3 pt-2">
          <ul className="flex flex-col">
            {NAV_LINKS.map((link, index) => (
              <li key={link.href} className="animate-rise" style={{ animationDelay: `${60 + index * 40}ms` }}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center justify-between rounded-xl px-3 text-[17px] font-medium tracking-tight text-fg transition-colors hover:bg-surface-2"
                >
                  {link.label}
                  <ArrowUpRight className="size-4 text-fg-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <span className="label-micro">Theme</span>
          <ThemeSwitch />
        </div>
      </SheetContent>
    </Sheet>
  );
}
