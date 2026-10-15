import type { Metadata } from "next";
import FormsGuidesPageContent from "@/components/resources/FormsGuidesPageContent";
import { fetchPublishedSitePage } from "@/lib/sitePages";
import { cmsTopicMetadata } from "@/lib/cmsTopic";

const fallbackDescription =
  "Download CAISBE forms, templates, and practical guides for members, chapters, and facility professionals.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/resources/forms-and-guides", fallbackDescription)) ?? {
      title: "Forms and Guides | CAISBE",
      description: fallbackDescription,
    }
  );
}

export default async function FormsAndGuidesPage() {
  const page = await fetchPublishedSitePage("/resources/forms-and-guides");
  return (
    <FormsGuidesPageContent
      title={page?.title || "Forms and Guides"}
      lead={page?.lead || fallbackDescription}
    />
  );
}
