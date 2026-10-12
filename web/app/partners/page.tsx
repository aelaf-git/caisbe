import type { Metadata } from "next";
import PartnersPageContent from "@/components/partners/PartnersPageContent";
import { partnersContent } from "@/lib/data/partners";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/partners", partnersContent.metaDescription)) ?? {
      title: partnersContent.seoTitle,
      description: partnersContent.metaDescription,
    }
  );
}

export default async function PartnersPage() {
  return (await cmsTopicPage("/partners")) ?? <PartnersPageContent />;
}
