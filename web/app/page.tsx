import FeaturedInsights from "@/components/home/FeaturedInsights";
import HeroSection from "@/components/home/HeroSection";
import LatestFromIfma from "@/components/home/LatestFromIfma";
import MembershipCta from "@/components/home/MembershipCta";
import Newsletter from "@/components/home/Newsletter";
import Partners from "@/components/home/Partners";
import QuickLinks from "@/components/home/QuickLinks";
import Testimonials from "@/components/home/Testimonials";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroSection />
        <QuickLinks />
        <FeaturedInsights />
        <LatestFromIfma />
        <Testimonials />
        <MembershipCta />
        <Partners />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
