import { officeDirectionsUrl, officeEmbedUrl, offices } from "@/lib/data/home";

export default function OfficesSection() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark motion-safe:animate-page-fade-in md:text-4xl">
          Offices
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {offices.map((office, index) => (
            <div
              key={office.region}
              className="overflow-hidden rounded-[20px] bg-white shadow-hopewell transition duration-300 hover:-translate-y-1 motion-safe:animate-page-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="aspect-video w-full bg-[#f7f9fa]">
                <iframe
                  title={`${office.region} office map`}
                  src={officeEmbedUrl(office.mapQuery)}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <div className="p-5">
                <h3 className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
                  {office.region}
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-caisbe-muted">
                  {office.address}
                </p>
                <a
                  href={officeDirectionsUrl(office.mapQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex text-sm font-bold text-caisbe-red transition-colors hover:text-caisbe-red-dark"
                >
                  Direction
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
