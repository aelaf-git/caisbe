import type { Metadata } from "next";
import { EventsIndexContent } from "@/components/events/EventsPageContent";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

const fallbackDescription =
  "Explore CAISBE events, the Africa–Canada Built Environment Expo & Forum, conferences, webinars, and awards.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/events", fallbackDescription)) ?? {
      title: "Events | CAISBE",
      description: fallbackDescription,
    }
  );
}

export default async function EventsPage() {
  return (await cmsTopicPage("/events")) ?? <EventsIndexContent />;
}
