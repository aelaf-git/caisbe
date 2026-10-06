import type { Metadata } from "next";
import HelpDeskPageContent from "@/components/resources/HelpDeskPageContent";
import { helpDeskContent } from "@/lib/data/helpDesk";

export const metadata: Metadata = {
  title: helpDeskContent.seoTitle,
  description: helpDeskContent.metaDescription,
};

export default function HelpDeskPage() {
  return <HelpDeskPageContent />;
}
