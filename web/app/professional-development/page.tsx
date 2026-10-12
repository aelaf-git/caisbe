import type { Metadata } from "next";
import ProfessionalDevelopmentPageContent from "@/components/professional-development/ProfessionalDevelopmentPageContent";
import { cmsTopicMetadata } from "@/lib/cmsTopic";

const fallbackDescription =
  "Explore CAISBE certificate programs in facility management, property management, energy efficiency, and smart real estate technologies.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/professional-development", fallbackDescription)) ?? {
      title: "Professional Development | CAISBE",
      description: fallbackDescription,
    }
  );
}

export default function ProfessionalDevelopmentPage() {
  // Course catalog stays coded so published programs remain listed.
  return <ProfessionalDevelopmentPageContent />;
}
