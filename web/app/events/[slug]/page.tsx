import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventsSubpageContent } from "@/components/events/EventsPageContent";
import {
  eventsSlugs,
  getEventsPage,
  type EventsSlug,
} from "@/lib/data/events";
import { fetchPublishedSitePage, topicChrome } from "@/lib/sitePages";
import TopicPageContent from "@/components/pages/TopicPageContent";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return eventsSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getEventsPage(slug);
  if (page) {
    return {
      title: `${page.title} | CAISBE`,
      description: page.description,
    };
  }

  const published = await fetchPublishedSitePage(`/events/${slug}`);
  if (published) {
    return {
      title: `${published.title} | CAISBE`,
      description: published.description,
    };
  }
  return { title: "Events | CAISBE" };
  return {
    title: `${page.title} | CAISBE`,
    description: page.description,
  };
}

export default async function EventsSubpage({ params }: Props) {
  const { slug } = await params;
  const page = getEventsPage(slug);
  if (page) return <EventsSubpageContent slug={slug as EventsSlug} />;

  const published = await fetchPublishedSitePage(`/events/${slug}`);
  if (!published) notFound();
  const chrome = topicChrome(`/events/${slug}`);
  return (
    <TopicPageContent
      eyebrow={chrome.eyebrow}
      page={published}
      indexHref={chrome.indexHref}
      indexLabel={chrome.indexLabel}
    />
  );
}
