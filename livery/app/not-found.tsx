import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-4 sm:px-6">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center">
        <Logo />
      </div>
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center pb-24 text-center">
        <p className="label-micro">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Nothing is painted here yet.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
          This page doesn&apos;t exist, or it&apos;s still being built.
        </p>
        <Button asChild variant="secondary" className="mt-8">
          <Link href="/">
            <ArrowLeft /> Back to Livery
          </Link>
        </Button>
      </div>
    </div>
  );
}
