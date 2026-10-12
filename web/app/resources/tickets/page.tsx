import type { Metadata } from "next";
import TicketsPageContent from "@/components/resources/TicketsPageContent";
import { ticketsContent } from "@/lib/data/tickets";

export const metadata: Metadata = {
  title: ticketsContent.seoTitle,
  description: ticketsContent.metaDescription,
};

export default function TicketsPage() {
  return <TicketsPageContent />;
}
