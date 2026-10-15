import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import {
  learningFormatPath,
  professionalDevelopmentContent,
} from "@/lib/data/professional-development";
import { getServerT } from "@/lib/i18n/server";

export default async function LearningFormatsPageContent() {
  const { t } = await getServerT();
  const { formats } = professionalDevelopmentContent;

  return (
    <>
      <PageHero
        eyebrow={t("Professional Development", "Développement professionnel")}
        title={formats.title}
        lead={formats.description}
        backHref="/professional-development"
        backLabel={t("Back to certificate programs", "Retour aux programmes de certificat")}
      />
      <ContentSection
        title={formats.educationOptionsTitle}
        description={formats.educationOptionsIntro}
        wide
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {formats.items.map((format, index) => (
            <ContentCard
              key={format.slug}
              title={format.title}
              description={format.description}
              href={learningFormatPath(format.slug)}
              hrefLabel={t("View details", "Voir les détails")}
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
      </ContentSection>
    </>
  );
}
