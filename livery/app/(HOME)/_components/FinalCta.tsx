import { KitInput } from "./KitInput";

export function FinalCta() {
  return (
    <section className="px-4 pb-24 pt-4 sm:px-6 sm:pb-32">
      <div className="mx-auto max-w-6xl rounded-[28px] border border-border bg-surface px-6 py-14 sm:px-14 sm:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <p className="label-micro">Start here</p>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.035em] text-balance sm:text-5xl">
              Found a site you love?
              <span className="block text-fg-subtle">Give your app its livery.</span>
            </h2>
          </div>
          <KitInput compact />
        </div>
      </div>
    </section>
  );
}
