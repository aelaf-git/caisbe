import type { Metadata } from "next";
import { PageHero } from "@/components/pages/ContentPage";
import JobBoardList from "@/components/careers/JobBoardList";

export const metadata: Metadata = {
  title: "All Jobs | CAISBE Job Board",
  description:
    "Browse facility management jobs published by CAISBE across Canada, Africa, and global markets.",
};

export default function AllJobsPage() {
  return (
    <>
      <PageHero
        eyebrow="CAISBE Job Board"
        title="View All Jobs"
        lead="Facility management opportunities published by CAISBE. Listings are removed automatically when their expiry date passes."
        backHref="/careers"
        backLabel="Back to careers"
      />

      <JobBoardList />
    </>
  );
}
