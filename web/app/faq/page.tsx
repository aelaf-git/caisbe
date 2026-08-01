import type { Metadata } from "next";
import FaqSection from "@/components/home/FaqSection";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | CAISBE",
  description:
    "Find answers about CAISBE certificate programs, exams, learning formats, CPD, and enrollment.",
};

export default function FaqPage() {
  return <FaqSection />;
}
