import type { Metadata } from "next";
import BackButton from "@/components/ui/BackButton";
import ButtonLink from "@/components/ui/ButtonLink";
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
        lead="Facility management opportunities published by CAISBE across Canada, Africa, and global markets."
        actions={
          <>
            <BackButton href="/careers" label="Back to careers" />
            <ButtonLink href="/careers" variant="secondary">
              Career Resources
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          Openings are published by CAISBE. Each listing has a post date and an
          expiry date—expired roles are removed from this board automatically.
        </p>
      </PageHero>

      <JobBoardList title="Open roles" />
    </>
  );
}
