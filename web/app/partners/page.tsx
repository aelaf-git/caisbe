import type { Metadata } from "next";
import PartnersPageContent from "@/components/partners/PartnersPageContent";
import { partnersContent } from "@/lib/data/partners";

export const metadata: Metadata = {
  title: partnersContent.seoTitle,
  description: partnersContent.metaDescription,
};

export default function PartnersPage() {
  return <PartnersPageContent />;
}
