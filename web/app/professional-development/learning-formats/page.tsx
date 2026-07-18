import type { Metadata } from "next";
import LearningFormatsPageContent from "@/components/professional-development/LearningFormatsPageContent";

export const metadata: Metadata = {
  title: "Learning Formats | CAISBE",
  description:
    "Explore CAISBE learning formats including online, virtual live, in-person, and on-site corporate training.",
};

export default function LearningFormatsPage() {
  return <LearningFormatsPageContent />;
}
