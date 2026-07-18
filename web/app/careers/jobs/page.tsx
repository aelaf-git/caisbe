import type { Metadata } from "next";
import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/pages/ContentPage";
import { careersContent } from "@/lib/data/careers";

export const metadata: Metadata = {
  title: "All Jobs | CAISBE Job Board",
  description:
    "Browse facility management jobs across Canada, Africa, and global markets.",
};

export default function AllJobsPage() {
  return (
    <PageHero
      eyebrow="CAISBE Job Board"
      title="View All Jobs"
      actions={
        <>
          <ButtonLink href="/careers" variant="secondary">
            Back to Careers
          </ButtonLink>
          <ButtonLink href="/contact" variant="primary">
            Post a Job
          </ButtonLink>
        </>
      }
    >
      <p className="mt-6 text-base leading-7 text-caisbe-muted">
        Explore facility management opportunities across Canada, Africa, and
        global markets. Full job listings will appear here as employer
        partnerships and postings are published.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {careersContent.jobBoard.roles.map((role) => (
          <li
            key={role}
            className="brand-card-shadow rounded-lg border border-ifma-border-light bg-white px-4 py-3 text-sm font-medium text-caisbe-green"
          >
            {role}
          </li>
        ))}
      </ul>
    </PageHero>
  );
}
