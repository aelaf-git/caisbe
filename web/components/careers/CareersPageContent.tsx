import ButtonLink from "@/components/ui/ButtonLink";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import JobBoardList from "@/components/careers/JobBoardList";
import { careersContent } from "@/lib/data/careers";

export default function CareersPageContent() {
  const { title, intro, jobBoard, careerResources, eyebrow } = careersContent;

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        lead={intro}
        actions={
          <ButtonLink href={jobBoard.ctaHref} variant="primary">
            {jobBoard.ctaLabel}
          </ButtonLink>
        }
      />

      <JobBoardList title={jobBoard.title} limit={4} />

      <ContentSection id="career-resources" title={careerResources.title}>
        <ul className="space-y-3">
          {careerResources.items.map((item) => (
            <li
              key={item}
              className="shadow-brand-card rounded-lg border border-ifma-border-light bg-white px-4 py-3 text-sm font-medium text-caisbe-red"
            >
              {item}
            </li>
          ))}
        </ul>
      </ContentSection>
    </>
  );
}
