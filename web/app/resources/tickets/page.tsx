import type { Metadata } from "next";
import TicketsPageContent from "@/components/resources/TicketsPageContent";
import { ticketsContent } from "@/lib/data/tickets";
import { cmsTopicMetadata } from "@/lib/cmsTopic";
import { fetchPublishedSitePage } from "@/lib/sitePages";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/resources/tickets", ticketsContent.metaDescription)) ?? {
      title: ticketsContent.seoTitle,
      description: ticketsContent.metaDescription,
    }
  );
}

export default async function TicketsPage() {
  const page = await fetchPublishedSitePage("/resources/tickets");
  return <TicketsPageContent title={page?.title} intro={page?.lead} />;
}
