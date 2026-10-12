import type { Metadata } from "next";
import HelpSupportPage from "@/components/support/HelpSupportPage";
import { cmsTopicMetadata } from "@/lib/cmsTopic";
import { fetchPublishedSitePage } from "@/lib/sitePages";

const fallbackDescription =
  "FAQs, technical support tickets, and requests for courses, certificates, your account, and problems to report.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/help", fallbackDescription)) ?? {
      title: "Help and Support | CAISBE",
      description: fallbackDescription,
    }
  );
}

export default async function HelpPage() {
  const page = await fetchPublishedSitePage("/help");
  return <HelpSupportPage title={page?.title} lead={page?.lead} />;
}
