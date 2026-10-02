import type { Metadata } from "next";
import NewsPageContent from "@/components/news/NewsPageContent";

export const metadata: Metadata = {
  title: "News & Announcements | CAISBE",
  description:
    "CAISBE news and announcements on membership, events, learning, and institute updates.",
};

export default function NewsPage() {
  return <NewsPageContent />;
}
