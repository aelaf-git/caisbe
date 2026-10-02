import { PageHero } from "@/components/pages/ContentPage";
import JobBoardList from "@/components/careers/JobBoardList";
import { careersContent } from "@/lib/data/careers";

export default function CareersPageContent() {
  const { title, intro, eyebrow } = careersContent;

  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} lead={intro} />

      <JobBoardList limit={4} />
    </>
  );
}
