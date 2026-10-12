import { PageHero, heroNoteClassName } from "@/components/pages/ContentPage";
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
      >
        {format.details.map((paragraph) => (
          <p key={paragraph} className={heroNoteClassName}>
            {paragraph}
          </p>
        ))}
      </PageHero>
    </>
  );
}
