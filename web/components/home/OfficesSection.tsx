import { globalMission, offices } from "@/lib/data/home";

export default function OfficesSection() {
  return (
    <section className="bg-ifma-navy py-16 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">
            Sustainability
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            {globalMission.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/85">
            {globalMission.description}
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {offices.map((office) => (
            <div
              key={office.region}
              className="border border-white/20 bg-white/5 p-6 backdrop-blur-sm"
            >
              <h3 className="text-lg font-semibold">{office.region}</h3>
              <p className="mt-3 text-sm leading-6 text-white/85">
                {office.address}
              </p>
              <span className="mt-4 inline-flex cursor-default text-sm font-semibold uppercase tracking-wide text-ifma-blue-bright">
                Direction
              </span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center">
          <span className="cursor-default text-sm font-semibold uppercase tracking-wide text-white/90 underline decoration-white/40">
            View our offices
          </span>
        </p>
      </div>
    </section>
  );
}
