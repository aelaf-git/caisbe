import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventsSubpageContent } from "@/components/events/EventsPageContent";
import {
  eventsSlugs,
  getEventsPage,
  type EventsSlug,
} from "@/lib/data/events";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

type Props = { params: Promise<{ slug: string }> };

/** Live calendar UI stays coded; other event pages prefer Admin Pages content. */
const SPECIAL_EVENT_SLUGS = new Set(["calendar"]);

export function generateStaticParams() {
  return eventsSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SPECIAL_EVENT_SLUGS.has(slug)) {
    const published = await cmsTopicMetadata(`/events/${slug}`, "Events | CAISBE");
    if (published) return published;
  }

  const page = getEventsPage(slug);
  if (page) {
    return {
      title: `${page.title} | CAISBE`,
      description: page.description,
    };
  }

  const published = await cmsTopicMetadata(`/events/${slug}`, "Events | CAISBE");
  if (published) return published;
  return { title: "Events | CAISBE" };
}

export default async function EventsSubpage({ params }: Props) {
  const { slug } = await params;

  if (!SPECIAL_EVENT_SLUGS.has(slug)) {
    const cms = await cmsTopicPage(`/events/${slug}`);
    if (cms) return cms;
  }

  const page = getEventsPage(slug);
  if (page) return <EventsSubpageContent slug={slug as EventsSlug} />;

  const cms = await cmsTopicPage(`/events/${slug}`);
  if (!cms) notFound();
  return cms;
}
