import Link from "next/link";
import { kitHome } from "@/lib/kit/urls";
import type { KitCard } from "@/services/kitRead";

// Under the hero: the library itself, as two slow rows of real layout frames
// (content removed: only structure, rhythm and colour remain). Hover pauses
// the rows; each frame opens its kit.

function Frame({ kit }: { kit: KitCard }) {
  return (
    <Link
      href={kitHome(kit.slug)}
      className="group/frame relative block w-[19rem] shrink-0 overflow-hidden rounded-[14px] border border-border bg-surface shadow-card transition-[border-color,transform] duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-border-strong sm:w-[23rem]"
    >
      <div className="h-44 overflow-hidden bg-surface-2 sm:h-52">
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
        <img
          src={kit.preview!}
          alt={`Layout of ${kit.title}, content removed`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top transition-[object-position] duration-[2400ms] ease-out-soft group-hover/frame:object-[50%_35%]"
        />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-2.5">
        <span className="truncate text-[13px] font-semibold tracking-tight">{kit.title}</span>
        <span className="flex shrink-0 gap-1" aria-hidden>
          {kit.swatches.slice(0, 4).map((colour, i) => (
            <span key={`${colour}-${i}`} className="size-3 rounded-full border border-border" style={{ background: colour }} />
          ))}
        </span>
      </div>
    </Link>
  );
}

function Row({ kits, direction, duration }: { kits: KitCard[]; direction: "left" | "right"; duration: number }) {
  // Repeat until one copy is wide enough, then double it for a seamless loop.
  const copy = Array.from({ length: Math.max(1, Math.ceil(6 / kits.length)) }, () => kits).flat();
  return (
    <div className="wall-row flex w-max gap-4 pr-4" data-direction={direction} style={{ "--wall-duration": `${duration}s` } as React.CSSProperties}>
      {[...copy, ...copy].map((kit, i) => (
        <div key={`${kit.slug}-${i}`} aria-hidden={i >= copy.length || undefined} inert={i >= copy.length || undefined}>
          <Frame kit={kit} />
        </div>
      ))}
    </div>
  );
}

export function LibraryWall({ kits }: { kits: KitCard[] }) {
  const framed = kits.filter((k) => k.preview);
  if (framed.length < 3) return null;
  const half = Math.ceil(framed.length / 2);
  const top = framed.slice(0, half);
  const bottom = framed.length > 4 ? framed.slice(half) : [...framed].reverse();
  return (
    <section aria-label="From the library" className="wall relative overflow-hidden border-y border-border bg-surface-2/40 py-10 sm:py-14">
      <div className="mx-auto mb-7 flex max-w-[80rem] items-end justify-between gap-4 px-4 sm:px-6">
        <p className="label-micro">Fresh from the library · layouts with the content removed</p>
        <Link href="/explore" className="hidden text-[13px] font-medium text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg sm:inline">
          See all kits
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        <Row kits={top} direction="left" duration={top.length * 11} />
        <Row kits={bottom} direction="right" duration={bottom.length * 13} />
      </div>
    </section>
  );
}
