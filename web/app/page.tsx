import type { Metadata } from "next";
import AboutSection from "@/components/home/AboutSection";
import CertificatesSection from "@/components/home/CertificatesSection";
import ContactSection from "@/components/home/ContactSection";
import HeroSection from "@/components/home/HeroSection";
import MagazineSection from "@/components/home/MagazineSection";
import OfficesSection from "@/components/home/OfficesSection";
import StatsSection from "@/components/home/StatsSection";
import SustainabilitySection from "@/components/home/SustainabilitySection";
import Testimonials from "@/components/home/Testimonials";
import { contactContent, offices, siteFullName, siteName } from "@/lib/data/home";
import { homeDescription, homeTitle, siteOrigin } from "@/lib/site";
import { fetchHomeLanding } from "@/lib/sitePages";

export const metadata: Metadata = {
  title: { absolute: homeTitle },
  description: homeDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: "/",
    siteName,
    type: "website",
    images: [{ url: "/images/hero_1.jpeg", alt: siteFullName }],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: ["/images/hero_1.jpeg"],
  },
};

function calgaryAddress() {
  const canada = offices.find((office) => office.region === "Canada");
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

function homeJsonLd() {
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
        email: contactContent.email,
        address: calgaryAddress(),
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
  const landing = await fetchHomeLanding();

  return (
    <div className="font-hopewell bg-[#f8fafc]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd()) }}
      />
      <HeroSection intro={landing.hero_intro} />
      <StatsSection items={landing.stats} />
      <AboutSection tagline={landing.tagline} />
      <CertificatesSection />
      <MagazineSection />
      <SustainabilitySection />
      <OfficesSection />
      <Testimonials />
      <ContactSection variant="home" />
    </div>
  );
}
