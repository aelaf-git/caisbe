import { stats } from "@/lib/data/home";

export default function StatsSection() {
  return (
    <section className="border-b border-ifma-border-light bg-ifma-navy py-12 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-4xl font-bold text-ifma-blue-bright md:text-5xl">
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/85">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
