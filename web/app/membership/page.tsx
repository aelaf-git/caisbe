import type { Metadata } from "next";
import { MembershipIndexContent } from "@/components/membership/MembershipPageContent";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

const fallbackDescription =
  "Join CAISBE for membership benefits, professional development, and a community advancing facility management.";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/membership", fallbackDescription)) ?? {
      title: "Membership | CAISBE",
      description: fallbackDescription,
    }
  );
}

export default async function MembershipPage() {
  return (await cmsTopicPage("/membership")) ?? <MembershipIndexContent />;
}
