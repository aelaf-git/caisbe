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
      backHref={learningFormatsPath()}
      backLabel="Back to learning formats"
    />
  );
}
