import type { Metadata } from "next";
import HelpSupportPage from "@/components/support/HelpSupportPage";

export const metadata: Metadata = {
  title: "Help and Support | CAISBE",
  description:
    "FAQs, technical support tickets, and requests for courses, certificates, your account, and problems to report.",
};

export default function HelpPage() {
  return <HelpSupportPage />;
}
