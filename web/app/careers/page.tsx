import type { Metadata } from "next";
import CareersPageContent from "@/components/careers/CareersPageContent";
import { careersContent } from "@/lib/data/careers";
import { cmsTopicMetadata } from "@/lib/cmsTopic";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/careers", careersContent.metaDescription)) ?? {
      title: careersContent.seoTitle,
      description: careersContent.metaDescription,
    }
  );
}

export default function CareersPage() {
  return <CareersPageContent />;
}
