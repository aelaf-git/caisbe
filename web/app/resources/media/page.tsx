import type { Metadata } from "next";
import { MediaIndexContent } from "@/components/resources/MembersCornerContent";
import { mediaContent } from "@/lib/data/resources";

export const metadata: Metadata = {
  title: "Media | CAISBE",
  description: mediaContent.description,
};

export default function MediaPage() {
  return <MediaIndexContent />;
}
