import type { Metadata } from "next";
import ContactSection from "@/components/home/ContactSection";
import { fetchHomeLanding } from "@/lib/sitePages";

const fallbackDescription =
  "Get in touch with the Canada Africa Institute for the Sustainable Built Environment.";

export async function generateMetadata(): Promise<Metadata> {
  const landing = await fetchHomeLanding();
  const title = landing?.contact_title?.trim() || "Contact Us";
  return {
    title: `${title} | CAISBE`,
    description: landing?.contact_lead?.trim() || fallbackDescription,
  };
}

export default async function ContactPage() {
  const landing = await fetchHomeLanding();
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
