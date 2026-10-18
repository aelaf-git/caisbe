import type { Metadata } from "next";
import AboutSection from "@/components/home/AboutSection";
import CertificatesSection from "@/components/home/CertificatesSection";
import ContactSection from "@/components/home/ContactSection";
import HeroSection from "@/components/home/HeroSection";
import MagazineSection from "@/components/home/MagazineSection";
import OfficesSection from "@/components/home/OfficesSection";
import SeminarsSection from "@/components/home/SeminarsSection";
import StatsSection from "@/components/home/StatsSection";
import SustainabilitySection from "@/components/home/SustainabilitySection";
import Testimonials from "@/components/home/Testimonials";
import { contactContent, offices, siteFullName, siteName } from "@/lib/data/home";
import { getDictionary } from "@/lib/i18n";
import { OG_LOCALE, localeAlternates } from "@/lib/i18n/seo";
import { getServerLocale } from "@/lib/i18n/server";
import { homeDescription, homeTitle, siteOrigin } from "@/lib/site";
import { fetchHomeLanding } from "@/lib/sitePages";

const HOME_FR = {
  title: "Éducation en gestion des installations et des biens immobiliers pour l’Afrique | CAISBE",
  description:
    "Le CAISBE prépare la prochaine génération de professionnels de la gestion des installations et des biens immobiliers à mener la transformation durable des bâtiments et des infrastructures en Afrique.",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title = locale === "fr" ? HOME_FR.title : homeTitle;
  const description = locale === "fr" ? HOME_FR.description : homeDescription;
  const alternates = localeAlternates("/", locale);
  return {
    title: { absolute: siteName },
    description,
    alternates: alternates.alternates,
    openGraph: {
      title,
      description,
      url: "/",
      siteName,
      type: "website",
      locale: OG_LOCALE[locale],
      images: [{ url: "/images/hero_1.jpeg", alt: siteFullName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/hero_1.jpeg"],
    },
  };
}

function calgaryAddress(landingOffices: { region: string; address: string }[] | null) {
  const source = landingOffices?.length ? landingOffices : offices;
  const canada = source.find((office) => office.region === "Canada");
  const [streetLine = "", postalLine = ""] = (canada?.address ?? "").split("\n");
  const [street = "", place = ""] = streetLine.split(",");
  const placeParts = place.trim().split(/\s+/);
  const region = placeParts.length > 1 ? placeParts[placeParts.length - 1] : "Alberta";
  const localityRaw = placeParts.slice(0, -1).join(" ") || "Calgary";
  const locality = localityRaw
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    "@type": "PostalAddress",
    streetAddress: street.trim(),
    addressLocality: locality,
    addressRegion: region,
    postalCode: postalLine.trim(),
    addressCountry: "CA",
  };
}

function homeJsonLd(landing: Awaited<ReturnType<typeof fetchHomeLanding>>) {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        name: siteFullName,
        alternateName: siteName,
        url: origin,
        logo: `${origin}/images/logo.png`,
        description: homeDescription,
        email: landing?.contact_email || contactContent.email,
        address: calgaryAddress(landing?.offices ?? null),
      },
      {
        "@type": "WebSite",
        name: siteName,
        url: origin,
      },
    ],
  };
}

export default async function Home() {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const landing = await fetchHomeLanding(locale);

  return (
    <div className="font-hopewell bg-[#f8fafc]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd(landing)) }}
      />
      <HeroSection />
      <StatsSection items={landing?.stats} />
      <AboutSection
        tagline={landing?.tagline}
        eyebrow={landing?.about_eyebrow}
        body={landing?.about_body}
        cta={landing?.about_cta}
        highlights={landing?.about_highlights}
      />
      <CertificatesSection
        title={landing?.certificates_title}
        subtitle={landing?.certificates_subtitle}
        cta={landing?.certificates_cta}
        emptyMessage={dict.certificates.empty}
      />
      <SeminarsSection
        title={landing?.seminars_title}
        body1={landing?.seminars_body_1}
        body2={landing?.seminars_body_2}
        cta={landing?.seminars_cta}
        emptyMessage={dict.seminars.empty}
      />
      <MagazineSection
        title={landing?.magazine_title}
        subtitle={landing?.magazine_subtitle}
        cta={landing?.magazine_cta}
        emptyMessage={dict.magazine.empty}
        readIssueLabel={dict.magazine.readIssue}
        badgeLabel={dict.magazine.badge}
      />
      <SustainabilitySection
        eyebrow={landing?.practice_eyebrow}
        title={landing?.practice_title}
        body={landing?.practice_body}
        items={landing?.practice_items}
      />
      <OfficesSection
        title={landing?.offices_title}
        directionLabel={dict.offices.direction}
        items={
          landing
            ? landing.offices.map((office) => ({
                region: office.region,
                address: office.address,
                mapQuery: office.map_query,
              }))
            : undefined
        }
      />
      <Testimonials eyebrow={landing?.testimonials_eyebrow} title={landing?.testimonials_title} />
      <ContactSection
        variant="home"
        eyebrow={landing?.contact_eyebrow}
        title={landing?.contact_title}
        lead={landing?.contact_lead}
        address={landing?.contact_address}
        phone={landing?.contact_phone}
        email={landing?.contact_email}
        hours={landing?.contact_hours}
        formHeading={landing?.contact_form_heading}
        cta={landing?.contact_cta}
        labels={dict.contact}
      />
    </div>
  );
}
