import type { Metadata } from "next";
import UnderConstruction from "@/components/pages/UnderConstruction";

export const metadata: Metadata = {
  title: "Store / Bookstore | CAISBE",
  description:
    "The CAISBE bookstore is under construction. Check back soon for publications and practice guides.",
};

export default function StorePage() {
  return <UnderConstruction title="Store / Bookstore" />;
}
