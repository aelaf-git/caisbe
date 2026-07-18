import type { Metadata } from "next";
import { EventsIndexContent } from "@/components/events/EventsPageContent";

export const metadata: Metadata = {
  title: "Events | CAISBE",
  description:
    "Explore CAISBE events, the Africa–Canada Built Environment Expo & Forum, conferences, webinars, and awards.",
};

export default function EventsPage() {
  return <EventsIndexContent />;
}
