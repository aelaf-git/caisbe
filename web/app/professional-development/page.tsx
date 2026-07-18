import type { Metadata } from "next";
import ProfessionalDevelopmentPageContent from "@/components/professional-development/ProfessionalDevelopmentPageContent";

export const metadata: Metadata = {
  title: "Professional Development | CAISBE",
  description:
    "Explore CAISBE certificate programs in facility management, property management, energy efficiency, and smart real estate technologies.",
};

export default function ProfessionalDevelopmentPage() {
  return <ProfessionalDevelopmentPageContent />;
}
