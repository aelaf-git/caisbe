import ContactForm from "@/components/contact/ContactForm";
import { contactContent, offices } from "@/lib/data/home";

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
    <section className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto max-w-3xl px-4">
        <p className="brand-eyebrow text-center text-sm font-semibold uppercase tracking-[0.25em]">
          {eyebrow}
        </p>
        <h2 className="brand-section-title mt-3 text-center text-3xl font-semibold">
          {title}
        </h2>

        <div className="mt-10">
          <ContactForm />
        </div>

        {showOffices && (
          <div className="mt-16 border-t border-ifma-border-light pt-12">
            <h3 className="brand-section-title text-center text-xl font-semibold">
              Our Offices
            </h3>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {offices.map((office) => (
                <div
                  key={office.region}
                  className="brand-card-shadow rounded-lg border border-ifma-border-light bg-white p-5 text-center"
                >
                  <p className="font-semibold text-caisbe-green">{office.region}</p>
                  <p className="mt-2 text-sm leading-6 text-caisbe-muted">
                    {office.address}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
