import Link from "next/link";
import { cn } from "@/lib/utils";

// The mark: a rounded tile with one slanted stripe, the way a livery is a
// single stripe of paint that makes a plain airframe recognisable.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)}>
      <rect width="24" height="24" rx="7" className="fill-fg" />
      <path d="M7.5 24 L19 3.2 L24 3.2 L24 7 L14.6 24 Z" className="fill-accent" />
      <rect x="5.25" y="5.25" width="2.75" height="10.5" rx="1.375" className="fill-bg" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Livery home"
      className={cn("group inline-flex items-center gap-2 rounded-lg text-fg", className)}
    >
      <LogoMark className="transition-transform duration-300 ease-out-soft group-hover:-rotate-6" />
      <span className="text-[17px] font-semibold tracking-tight">livery</span>
    </Link>
  );
}
