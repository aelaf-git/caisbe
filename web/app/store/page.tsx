import type { Metadata } from "next";
import StorePageContent from "@/components/store/StorePageContent";

export const metadata: Metadata = {
  title: "Store / Bookstore | CAISBE",
  description:
    "Browse CAISBE publications, practice guides, and member materials. Contact us to order.",
};

export default function StorePage() {
  return <StorePageContent />;
}
