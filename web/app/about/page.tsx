import type { Metadata } from "next";
import AboutPageContent from "@/components/about/AboutPageContent";
import { aboutContent } from "@/lib/data/about";

export const metadata: Metadata = {
  title: aboutContent.seoTitle,
  description: aboutContent.metaDescription,
};

export default function AboutPage() {
  return <AboutPageContent />;
}
