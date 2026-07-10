import { partnerTiers } from "@/lib/data/home";

export default function Partners() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-ifma-blue">
          Proud Partners
        </p>
        <h2 className="ifma-section-title mt-3 text-3xl font-semibold">
          Proudly supported by some of the world&apos;s leading brands
        </h2>

        <div className="mt-10 space-y-8">
          {partnerTiers.map((tier) => (
            <div key={tier}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-ifma-muted">
                {tier}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6">
                {Array.from({ length: tier.includes("PLATINUM") ? 3 : 4 }).map(
                  (_, index) => (
                    <div
                      key={`${tier}-${index}`}
                      className="flex h-20 w-44 items-center justify-center border border-ifma-border-light bg-ifma-surface text-sm font-medium text-ifma-muted"
                    >
                      Partner Logo
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
