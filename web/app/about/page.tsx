import type { Metadata } from "next";
import AboutPageContent from "@/components/about/AboutPageContent";
import { aboutContent } from "@/lib/data/about";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/about", aboutContent.metaDescription)) ?? {
      title: aboutContent.seoTitle,
      description: aboutContent.metaDescription,
    }
  );
}

export default async function AboutPage() {
  return (await cmsTopicPage("/about")) ?? <AboutPageContent />;
}
