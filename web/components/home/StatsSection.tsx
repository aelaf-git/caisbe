import { stats } from "@/lib/data/home";

export default function StatsSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-12 md:py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
        {stats.map((item) => (
          <div
            key={item.label}
            className="flex h-full min-h-[10.5rem] flex-col items-center rounded-lg border border-ifma-border bg-white px-5 py-6 text-center"
          >
            <p className="shrink-0 text-4xl font-bold leading-none text-caisbe-red md:text-5xl">
              {item.value}
            </p>
            <p className="mt-4 flex flex-1 items-start justify-center text-sm font-medium leading-6 text-caisbe-text">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
