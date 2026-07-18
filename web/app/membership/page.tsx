import type { Metadata } from "next";
import { MembershipIndexContent } from "@/components/membership/MembershipPageContent";

export const metadata: Metadata = {
  title: "Membership | CAISBE",
  description:
    "Join CAISBE for membership benefits, professional development, and a community advancing facility management.",
};

export default function MembershipPage() {
  return <MembershipIndexContent />;
}
