import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventsSubpageContent } from "@/components/events/EventsPageContent";
import {
  eventsSlugs,
  getEventsPage,
  type EventsSlug,
} from "@/lib/data/events";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return eventsSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getEventsPage(slug);
  if (!page) return { title: "Events | CAISBE" };
  return {
    title: `${page.title} | CAISBE`,
    description: page.description,
  };
}

export default async function EventsSubpage({ params }: Props) {
  const { slug } = await params;
  const page = getEventsPage(slug);
  if (!page) notFound();

  return <EventsSubpageContent slug={slug as EventsSlug} />;
}
