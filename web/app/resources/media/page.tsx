import type { Metadata } from "next";
import { MediaIndexContent } from "@/components/resources/MembersCornerContent";
import { mediaContent } from "@/lib/data/resources";
import { cmsTopicMetadata } from "@/lib/cmsTopic";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/resources/media", mediaContent.description)) ?? {
      title: "Media | CAISBE",
      description: mediaContent.description,
    }
  );
}

export default function MediaPage() {
  return <MediaIndexContent />;
}
