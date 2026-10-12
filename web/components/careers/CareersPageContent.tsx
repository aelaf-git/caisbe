import { PageHero } from "@/components/pages/ContentPage";
import JobBoardList from "@/components/careers/JobBoardList";
import { careersContent } from "@/lib/data/careers";
import { fetchPublishedSitePage } from "@/lib/sitePages";

export default async function CareersPageContent() {
  const { title, intro, eyebrow } = careersContent;
  const page = await fetchPublishedSitePage("/careers");

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={page?.title?.trim() || title}
        lead={page?.lead?.trim() || intro}
      />

      <JobBoardList limit={4} />
    </>
  );
}
