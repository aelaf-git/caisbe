import {
  globalMission,
  officeDirectionsUrl,
  officeEmbedUrl,
  offices,
} from "@/lib/data/home";
import ButtonLink from "@/components/ui/ButtonLink";

export default function OfficesSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-caisbe-red text-sm font-semibold uppercase tracking-[0.25em]">
            Global Presence
          </p>
          <h2 className="font-display text-caisbe-text-dark mt-3 text-3xl font-semibold leading-tight md:text-4xl">
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
              className="shadow-brand-card overflow-hidden rounded-lg border border-ifma-border-light bg-white"
            >
              <div className="aspect-[16/10] w-full bg-admin-canvas">
                <iframe
                  title={`${office.region} office map`}
                  src={officeEmbedUrl(office.mapQuery)}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-caisbe-text-dark">{office.region}</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-caisbe-muted">
                  {office.address}
                </p>
                <a
                  href={officeDirectionsUrl(office.mapQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark"
                >
                  Direction
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center">
          <ButtonLink href="/contact" variant="textGreen">
            Contact our offices
          </ButtonLink>
        </p>
      </div>
    </section>
  );
}
