import AboutSection from "@/components/home/AboutSection";
import CertificatesSection from "@/components/home/CertificatesSection";
import ContactSection from "@/components/home/ContactSection";
import FaqSection from "@/components/home/FaqSection";
import HeroSection from "@/components/home/HeroSection";
import OfficesSection from "@/components/home/OfficesSection";
import ProjectsSection from "@/components/home/ProjectsSection";
import StatsSection from "@/components/home/StatsSection";
import SustainabilitySection from "@/components/home/SustainabilitySection";
import TeamSection from "@/components/home/TeamSection";
import Testimonials from "@/components/home/Testimonials";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-white">
        <HeroSection />
        <StatsSection />
        <AboutSection />
        <CertificatesSection />
        <SustainabilitySection />
        <OfficesSection />
        <TeamSection />
        <ProjectsSection />
        <Testimonials />
        <ContactSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
