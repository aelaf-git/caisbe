import { stats } from "@/lib/data/home";

export default function StatsSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
        {stats.map((item, index) => (
          <div
            key={item.label}
            className="border-ifma-border-light px-4 py-6 text-center motion-safe:animate-page-fade-in sm:px-6 sm:py-8 [&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <p className="text-3xl font-bold leading-none text-caisbe-red md:text-4xl">
              {item.value}
            </p>
            <p className="mt-2 text-xs font-medium leading-5 text-caisbe-muted sm:text-sm">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
