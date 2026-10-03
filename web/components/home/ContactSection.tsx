import ContactForm from "@/components/contact/ContactForm";
import { PageHero, ContentSection } from "@/components/pages/ContentPage";
import {
  contactContent,
  officeDirectionsUrl,
  officeEmbedUrl,
  offices,
} from "@/lib/data/home";

type ContactSectionProps = {
  title?: string;
  eyebrow?: string;
  showOffices?: boolean;
  variant?: "page" | "home";
};

function ContactDetails() {
  return (
    <div className="mt-8 space-y-5">
      <h3 className="font-hopewell-display text-lg font-extrabold uppercase tracking-wide text-caisbe-text-dark">
        {contactContent.detailsHeading}
      </h3>
      <div>
        <p className="text-base font-semibold text-caisbe-text-dark">{contactContent.addressLabel}</p>
        <p className="mt-1 whitespace-pre-line text-base leading-7 text-caisbe-muted">
          {contactContent.address}
        </p>
      </div>
      <div>
        <p className="text-base font-semibold text-caisbe-text-dark">{contactContent.phoneLabel}</p>
        <p className="mt-1 text-base leading-7 text-caisbe-muted">{contactContent.phone}</p>
      </div>
      <div>
        <p className="text-base font-semibold text-caisbe-text-dark">{contactContent.emailLabel}</p>
        <a
          href={`mailto:${contactContent.email}`}
          className="mt-1 inline-block text-base leading-7 text-caisbe-red transition-colors hover:text-caisbe-red-dark"
        >
          {contactContent.email}
        </a>
      </div>
      <div>
        <p className="text-base font-semibold text-caisbe-text-dark">{contactContent.hoursLabel}</p>
        <p className="mt-1 text-base leading-7 text-caisbe-muted">{contactContent.hours}</p>
      </div>
    </div>
  );
}

export default function ContactSection({
  title = contactContent.title,
  eyebrow = contactContent.eyebrow,
  showOffices = false,
  variant = "page",
}: ContactSectionProps) {
  if (variant === "home") {
    return (
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="motion-safe:animate-page-fade-in">
            <p className="inline-flex rounded-full bg-caisbe-red/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-caisbe-red-dark">
              {eyebrow}
            </p>
            <h2 className="font-hopewell-display mt-4 text-3xl font-extrabold leading-tight tracking-tight text-caisbe-text-dark md:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-base leading-7 text-caisbe-muted">
              {contactContent.lead}
            </p>
            <ContactDetails />
          </div>
          <div
            className="rounded-[20px] bg-white p-5 shadow-hopewell motion-safe:animate-page-fade-in md:p-8"
            style={{ animationDelay: "120ms" }}
          >
            <ContactForm cta={contactContent.cta} heading={contactContent.formHeading} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} lead={contactContent.lead}>
        <div className="mt-10 grid max-w-5xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <ContactDetails />
          <ContactForm cta={contactContent.cta} heading={contactContent.formHeading} />
        </div>
      </PageHero>

      {showOffices ? (
        <ContentSection title="Our Offices" wide>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offices.map((office, index) => (
              <div
                key={office.region}
                className="overflow-hidden rounded-[20px] bg-white shadow-hopewell motion-safe:animate-page-fade-in"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="aspect-[16/10] w-full bg-[#fafafa]">
                  <iframe
                    title={`${office.region} office map`}
                    src={officeEmbedUrl(office.mapQuery)}
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
                <div className="p-5 text-center">
                  <p className="font-semibold text-caisbe-red">{office.region}</p>
                  <p className="mt-2 whitespace-pre-line text-base leading-7 text-caisbe-muted">
                    {office.address}
                  </p>
                  <a
                    href={officeDirectionsUrl(office.mapQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-base font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark"
                  >
                    Direction
                  </a>
                </div>
              </div>
            ))}
          </div>
        </ContentSection>
      ) : null}
    </>
  );
}
