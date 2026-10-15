import type { Metadata } from "next";
import ContactSection from "@/components/home/ContactSection";
import { getDictionary } from "@/lib/i18n";
import { getServerT } from "@/lib/i18n/server";
import { fetchHomeLanding } from "@/lib/sitePages";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getServerT();
  const fallbackDescription = t(
    "Get in touch with the Canada Africa Institute for the Sustainable Built Environment.",
    "Communiquez avec l’Institut canado-africain pour l’environnement bâti durable.",
  );
  const landing = await fetchHomeLanding(locale);
  const title = landing?.contact_title?.trim() || t("Contact Us", "Nous joindre");
  return {
    title: `${title} | CAISBE`,
    description: landing?.contact_lead?.trim() || fallbackDescription,
  };
}

export default async function ContactPage() {
  const { locale } = await getServerT();
  const landing = await fetchHomeLanding(locale);
  return (
    <ContactSection
      showOffices
      eyebrow={landing?.contact_eyebrow}
      title={landing?.contact_title}
      lead={landing?.contact_lead}
      address={landing?.contact_address}
      phone={landing?.contact_phone}
      email={landing?.contact_email}
      hours={landing?.contact_hours}
      formHeading={landing?.contact_form_heading}
      cta={landing?.contact_cta}
      labels={getDictionary(locale).contact}
      officeItems={
        landing
          ? landing.offices.map((office) => ({
              region: office.region,
              address: office.address,
              mapQuery: office.map_query,
            }))
          : undefined
      }
    />
  );
}
