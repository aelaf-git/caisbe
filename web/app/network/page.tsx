import type { Metadata } from "next";
import { NetworkIndexContent } from "@/components/network/NetworkPageContent";

export const metadata: Metadata = {
  title: "Network | CAISBE",
  description:
    "Connect with CAISBE networking groups and join the African Facility Management Discussion Forum.",
};

export default function NetworkPage() {
  return <NetworkIndexContent />;
}
