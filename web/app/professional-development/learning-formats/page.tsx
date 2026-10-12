import type { Metadata } from "next";
import LearningFormatsPageContent from "@/components/professional-development/LearningFormatsPageContent";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

const fallbackDescription =
  "Explore CAISBE learning formats including online, virtual live, in-person, and on-site corporate training.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata(
      "/professional-development/learning-formats",
      fallbackDescription,
    )) ?? {
      title: "Learning Formats | CAISBE",
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
