import { PageHero, heroNoteClassName } from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  learningFormatsPath,
  type LearningFormat,
} from "@/lib/data/professional-development";
import { getServerT } from "@/lib/i18n/server";

type LearningFormatPageContentProps = {
  format: LearningFormat;
};

export default async function LearningFormatPageContent({
  format,
}: LearningFormatPageContentProps) {
  const { t } = await getServerT();
  return (
    <>
      <PageHero
        eyebrow={t("Learning Formats", "Formats d’apprentissage")}
        title={format.title}
        lead={format.description}
        backHref={learningFormatsPath()}
        backLabel={t("Back to learning formats", "Retour aux formats d’apprentissage")}
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
