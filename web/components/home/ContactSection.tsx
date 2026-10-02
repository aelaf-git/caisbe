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
};

export default function ContactSection({
  title = contactContent.title,
  eyebrow = contactContent.eyebrow,
  showOffices = false,
}: ContactSectionProps) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} lead={contactContent.lead}>
        <div className="mt-10 max-w-2xl">
          <ContactForm cta={contactContent.cta} />
        </div>
      </PageHero>

      {showOffices ? (
        <ContentSection title="Our Offices" wide>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offices.map((office, index) => (
              <div
                key={office.region}
                className="shadow-brand-card overflow-hidden rounded-lg border border-ifma-border-light bg-white motion-safe:animate-page-fade-in"
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
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-caisbe-muted">
                    {office.address}
                  </p>
                  <a
                    href={officeDirectionsUrl(office.mapQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark"
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
