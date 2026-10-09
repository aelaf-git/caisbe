import type { Metadata } from "next";
import { NetworkIndexContent } from "@/components/network/NetworkPageContent";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

const fallbackDescription =
  "Connect with CAISBE networking groups and join the African Facility Management Discussion Forum.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/network", fallbackDescription)) ?? {
      title: "Network | CAISBE",
      description: fallbackDescription,
    }
  );
}

export default async function NetworkPage() {
  return (await cmsTopicPage("/network")) ?? <NetworkIndexContent />;
}
