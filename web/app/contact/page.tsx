import type { Metadata } from "next";
import ContactSection from "@/components/home/ContactSection";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Contact Us | CAISBE",
  description:
    "Get in touch with the Canada Africa Institute for the Sustainable Built Environment.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-white">
        <ContactSection
          eyebrow="Contact Us"
          title="Ready to Work Together? Build a FM team with us!"
          showOffices
        />
      </main>
      <Footer />
    </>
  );
}
