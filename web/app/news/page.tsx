import type { Metadata } from "next";
import NewsPageContent from "@/components/news/NewsPageContent";
import { cmsTopicMetadata } from "@/lib/cmsTopic";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  const fallbackDescription = t(
    "CAISBE news and announcements on membership, events, learning, and institute updates.",
    "Nouvelles et annonces du CAISBE sur l’adhésion, les événements, l’apprentissage et la vie de l’Institut.",
  );
  return (
    (await cmsTopicMetadata("/news", fallbackDescription)) ?? {
      title: t("News & Announcements | CAISBE", "Nouvelles et annonces | CAISBE"),
      description: fallbackDescription,
    }
  );
}

export default function NewsPage() {
  return <NewsPageContent />;
}
