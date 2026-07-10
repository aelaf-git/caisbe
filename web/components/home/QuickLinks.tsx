import { quickLinks } from "@/lib/data/home";

export default function QuickLinks() {
  return (
    <section className="border-b border-ifma-border-light bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 max-w-3xl">
          <h2 className="ifma-section-title text-3xl font-semibold leading-tight md:text-4xl">
            Network, training and resources to help you have the career you want
            in facility management.
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <span
              key={link}
              className="cursor-default border border-ifma-navy px-5 py-3 text-sm font-medium uppercase tracking-wide text-ifma-navy transition-colors hover:bg-ifma-navy hover:text-white"
            >
              {link}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
