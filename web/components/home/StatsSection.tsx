import { stats } from "@/lib/data/home";

export default function StatsSection() {
  return (
    <section className="border-b border-ifma-border-light bg-[#f7f9fa]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-8 lg:grid-cols-4 lg:py-10">
        {stats.map((item, index) => (
          <div
            key={item.label}
            className="text-center motion-safe:animate-page-fade-in"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <p className="font-sans text-2xl font-bold leading-none tracking-normal text-caisbe-text-dark md:text-[2rem]">
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-5 text-caisbe-muted">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
