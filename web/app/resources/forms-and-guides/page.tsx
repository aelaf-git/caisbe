import type { Metadata } from "next";
import FormsGuidesPageContent from "@/components/resources/FormsGuidesPageContent";
import { fetchPublishedSitePage } from "@/lib/sitePages";
import { cmsTopicMetadata } from "@/lib/cmsTopic";
import { getServerT } from "@/lib/i18n/server";

async function fallbackCopy() {
  const { t } = await getServerT();
  return {
    title: t("Forms and Guides", "Formulaires et guides"),
    description: t(
      "Download CAISBE forms, templates, and practical guides for members, chapters, and facility professionals.",
      "Téléchargez les formulaires, les modèles et les guides pratiques du CAISBE pour les membres, les sections et les professionnels des installations.",
    ),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { title, description: fallbackDescription } = await fallbackCopy();
  return (
    (await cmsTopicMetadata("/resources/forms-and-guides", fallbackDescription)) ?? {
      title: `${title} | CAISBE`,
      description: fallbackDescription,
    }
  );
}

export default async function FormsAndGuidesPage() {
  const page = await fetchPublishedSitePage("/resources/forms-and-guides");
  const fallback = await fallbackCopy();
  return (
    <FormsGuidesPageContent
      title={page?.title || fallback.title}
      lead={page?.lead || fallback.description}
    />
  );
}
