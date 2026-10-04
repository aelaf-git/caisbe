import AboutSection from "@/components/home/AboutSection";
import CertificatesSection from "@/components/home/CertificatesSection";
import ContactSection from "@/components/home/ContactSection";
import HeroSection from "@/components/home/HeroSection";
import MagazineSection from "@/components/home/MagazineSection";
import OfficesSection from "@/components/home/OfficesSection";
import PartnersSection from "@/components/home/PartnersSection";
import SustainabilitySection from "@/components/home/SustainabilitySection";
import Testimonials from "@/components/home/Testimonials";

export default function Home() {
  return (
    <div className="font-hopewell bg-[#f8fafc]">
      <HeroSection />
      <AboutSection />
      <CertificatesSection />
      <PartnersSection />
      <MagazineSection />
      <SustainabilitySection />
      <OfficesSection />
      <Testimonials />
      <ContactSection variant="home" />
    </div>
  );
}
