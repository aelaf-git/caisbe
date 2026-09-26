import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/pages/ContentPage";
import { learningFormatsPath } from "@/lib/data/professional-development";

type LearningFormatPageContentProps = {
  title: string;
  description: string;
};

export default function LearningFormatPageContent({
  title,
  description,
}: LearningFormatPageContentProps) {
  return (
    <PageHero
      eyebrow="Learning Formats"
      title={title}
      lead={description}
      actions={
        <>
          <ButtonLink href="/contact" variant="primary">
            Contact Us
          </ButtonLink>
          <ButtonLink href={learningFormatsPath()} variant="secondary">
            All Learning Formats
          </ButtonLink>
          <ButtonLink href="/professional-development" variant="secondary">
            Certificate Programs
          </ButtonLink>
        </>
      }
    />
  );
}
