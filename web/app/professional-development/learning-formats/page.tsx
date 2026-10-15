import type { Metadata } from "next";
import LearningFormatsPageContent from "@/components/professional-development/LearningFormatsPageContent";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  const fallbackDescription = t(
    "Explore CAISBE learning formats including online, virtual live, in-person, and on-site corporate training.",
    "Explorez les formats d’apprentissage du CAISBE : en ligne, classes virtuelles en direct, en personne et formation en entreprise sur place.",
  );
  return (
    (await cmsTopicMetadata(
      "/professional-development/learning-formats",
      fallbackDescription,
    )) ?? {
      title: t("Learning Formats | CAISBE", "Formats d’apprentissage | CAISBE"),
      description: fallbackDescription,
    }
  );
}

export default async function LearningFormatsPage() {
  return (
    (await cmsTopicPage("/professional-development/learning-formats")) ?? (
      <LearningFormatsPageContent />
    )
  );
}
