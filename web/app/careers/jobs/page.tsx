import type { Metadata } from "next";
import BackButton from "@/components/ui/BackButton";
import ButtonLink from "@/components/ui/ButtonLink";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import JobBoardList from "@/components/careers/JobBoardList";
import { careersContent } from "@/lib/data/careers";

export const metadata: Metadata = {
  title: "All Jobs | CAISBE Job Board",
  description:
    "Browse facility management jobs across Canada, Africa, and global markets.",
};

export default function AllJobsPage() {
  const { jobBoard } = careersContent;

  return (
    <>
      <PageHero
        eyebrow="CAISBE Job Board"
        title="View All Jobs"
        lead="Explore facility management opportunities across Canada, Africa, and global markets."
        actions={
          <>
            <BackButton href="/careers" label="Back to careers" />
            <ButtonLink href="/contact" variant="primary">
              Post a Job
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          Openings are curated by CAISBE. Each listing has an upload date and an
          expiry date—expired roles are removed from this board automatically.
        </p>
      </PageHero>

      <JobBoardList title="Open roles" />

      <ContentSection
        title="How to apply or post"
        description="Apply via the listing link when provided, or contact CAISBE. Employers can partner with us to list vacancies and internships."
      >
        <ul className="mt-2 grid gap-3 sm:grid-cols-2">
          {jobBoard.roles.map((role) => (
            <li
              key={role}
              className="shadow-brand-card rounded-lg border border-ifma-border-light bg-white px-4 py-3 text-sm font-medium text-caisbe-red"
            >
              {role}
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/contact" variant="primary">
            Contact Careers
          </ButtonLink>
          <ButtonLink href="/careers" variant="secondary">
            Career Resources
          </ButtonLink>
        </div>
      </ContentSection>
    </>
  );
}
