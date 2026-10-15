import { PageHero } from "@/components/pages/ContentPage";
import JobBoardList from "@/components/careers/JobBoardList";
import { careersContent } from "@/lib/data/careers";
import { fetchPublishedSitePage } from "@/lib/sitePages";
import { getServerT } from "@/lib/i18n/server";

export default async function CareersPageContent() {
  const { title, intro, eyebrow } = careersContent;
  const { t } = await getServerT();
  const page = await fetchPublishedSitePage("/careers");

  return (
    <>
      <PageHero
        eyebrow={t(eyebrow, "Carrières")}
        title={page?.title?.trim() || title}
        lead={page?.lead?.trim() || intro}
      />

      <JobBoardList limit={4} />
    </>
  );
}
