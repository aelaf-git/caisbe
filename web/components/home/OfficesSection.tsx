import Link from "next/link";
import { globalMission, offices } from "@/lib/data/home";
import ButtonLink from "@/components/ui/ButtonLink";
import { linkPath } from "@/lib/routes";

export default function OfficesSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            Global Presence
          </p>
          <h2 className="brand-section-title mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            {globalMission.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-caisbe-muted">
            {globalMission.description}
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {offices.map((office) => (
            <div
              key={office.region}
              className="brand-card-shadow rounded-lg border border-ifma-border-light bg-white p-6"
            >
              <h3 className="text-lg font-semibold text-caisbe-green">
                {office.region}
              </h3>
              <p className="mt-3 text-sm leading-6 text-caisbe-muted">
                {office.address}
              </p>
              <Link
                href={linkPath(office.region, "Offices")}
                className="mt-4 inline-flex text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-green"
              >
                Direction
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center">
          <ButtonLink href="/offices" variant="textGreen">
            View our offices
          </ButtonLink>
        </p>
      </div>
    </section>
  );
}
