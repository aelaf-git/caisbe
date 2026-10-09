import AboutSection from "@/components/home/AboutSection";
import CertificatesSection from "@/components/home/CertificatesSection";
import ContactSection from "@/components/home/ContactSection";
import HeroSection from "@/components/home/HeroSection";
import MagazineSection from "@/components/home/MagazineSection";
import OfficesSection from "@/components/home/OfficesSection";
import StatsSection from "@/components/home/StatsSection";
import SustainabilitySection from "@/components/home/SustainabilitySection";
import Testimonials from "@/components/home/Testimonials";
import { fetchHomeLanding } from "@/lib/sitePages";

export default async function Home() {
  const landing = await fetchHomeLanding();

  return (
    <div className="font-hopewell bg-[#f8fafc]">
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
