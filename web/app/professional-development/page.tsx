import type { Metadata } from "next";
import ProfessionalDevelopmentPageContent from "@/components/professional-development/ProfessionalDevelopmentPageContent";
import { cmsTopicMetadata } from "@/lib/cmsTopic";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  const fallbackDescription = t(
    "Explore CAISBE certificate programs in facility management, property management, energy efficiency, and smart real estate technologies.",
    "Explorez les programmes de certificat du CAISBE en gestion des installations, en gestion immobilière, en efficacité énergétique et en technologies immobilières intelligentes.",
  );
  return (
    (await cmsTopicMetadata("/professional-development", fallbackDescription)) ?? {
      title: t("Professional Development | CAISBE", "Développement professionnel | CAISBE"),
      description: fallbackDescription,
    }
  );
}

export default function ProfessionalDevelopmentPage() {
  // Course catalog stays coded so published programs remain listed.
  return <ProfessionalDevelopmentPageContent />;
}
