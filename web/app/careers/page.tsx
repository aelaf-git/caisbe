import type { Metadata } from "next";
import CareersPageContent from "@/components/careers/CareersPageContent";
import { careersContent } from "@/lib/data/careers";

export const metadata: Metadata = {
  title: careersContent.seoTitle,
  description: careersContent.metaDescription,
};

export default function CareersPage() {
  return <CareersPageContent />;
}
