import { stats } from "@/lib/data/home";

export default function StatsSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-12">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-ifma-border-light bg-white p-6 text-center"
          >
            <p
              className="text-4xl font-bold text-caisbe-red md:text-5xl"
            >
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-caisbe-muted">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
