import type { Metadata } from "next";
import NewsPageContent from "@/components/news/NewsPageContent";
import { cmsTopicMetadata } from "@/lib/cmsTopic";

const fallbackDescription =
  "CAISBE news and announcements on membership, events, learning, and institute updates.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/news", fallbackDescription)) ?? {
      title: "News & Announcements | CAISBE",
      description: fallbackDescription,
    }
  );
}

export default function NewsPage() {
  return <NewsPageContent />;
}
