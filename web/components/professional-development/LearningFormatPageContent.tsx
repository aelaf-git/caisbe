import {
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  learningFormatsPath,
  type LearningFormat,
} from "@/lib/data/professional-development";

type LearningFormatPageContentProps = {
  format: LearningFormat;
};

export default function LearningFormatPageContent({
  format,
}: LearningFormatPageContentProps) {
  return (
    <>
      <PageHero
        eyebrow="Learning Formats"
        title={format.title}
        lead={format.description}
        backHref={learningFormatsPath()}
        backLabel="Back to learning formats"
        actions={
          <ButtonLink href={format.ctaHref} variant="primary">
            {format.ctaLabel}
          </ButtonLink>
        }
      />
      <ContentSection title="About this format" wide>
        <div className="max-w-3xl space-y-5">
          {format.details.map((paragraph) => (
            <p key={paragraph} className="text-base leading-8 text-caisbe-text">
              {paragraph}
            </p>
          ))}
          <div className="pt-2">
            <ButtonLink href={format.ctaHref} variant="secondary">
              {format.ctaLabel}
            </ButtonLink>
          </div>
        </div>
      </ContentSection>
    </>
  );
}
