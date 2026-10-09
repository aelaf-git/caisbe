import type { Metadata } from "next";
import UnderConstruction from "@/components/pages/UnderConstruction";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

const fallbackDescription =
  "The CAISBE bookstore is under construction. Check back soon for publications and practice guides.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/store", fallbackDescription)) ?? {
      title: "Store / Bookstore | CAISBE",
      description: fallbackDescription,
    }
  );
}

export default async function StorePage() {
  return (await cmsTopicPage("/store")) ?? <UnderConstruction title="Store / Bookstore" />;
}
