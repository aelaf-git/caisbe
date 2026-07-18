import type { Metadata } from "next";
import { MembersCornerIndexContent } from "@/components/resources/MembersCornerContent";
import { membersCornerContent } from "@/lib/data/resources";

export const metadata: Metadata = {
  title: "Members Corner | CAISBE",
  description: membersCornerContent.description,
};

export default function MembersCornerPage() {
  return <MembersCornerIndexContent />;
}
