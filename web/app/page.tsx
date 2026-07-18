import AboutSection from "@/components/home/AboutSection";
import CertificatesSection from "@/components/home/CertificatesSection";
import ContactSection from "@/components/home/ContactSection";
import FaqSection from "@/components/home/FaqSection";
import HeroSection from "@/components/home/HeroSection";
import OfficesSection from "@/components/home/OfficesSection";
import StatsSection from "@/components/home/StatsSection";
import SustainabilitySection from "@/components/home/SustainabilitySection";
import Testimonials from "@/components/home/Testimonials";

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <AboutSection />
      <CertificatesSection />
      <SustainabilitySection />
      <OfficesSection />
      <Testimonials />
      <ContactSection />
      <FaqSection />
    </>
  );
}
