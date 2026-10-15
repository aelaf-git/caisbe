import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
  heroNoteClassName,
} from "@/components/pages/ContentPage";
import { projectsContent } from "@/lib/data/projects";
import { getServerT } from "@/lib/i18n/server";

export default async function ProjectsPageContent() {
  const { t } = await getServerT();
  const { eyebrow, title, lead, intro, items } = projectsContent;

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        actions={
          <>
            <ButtonLink href="/contact" variant="primary">
              {t("Partner With Us", "Devenir partenaire")}
            </ButtonLink>
            <ButtonLink href="/professional-development" variant="secondary">
              {t("Professional Development", "Développement professionnel")}
            </ButtonLink>
            <ButtonLink href="/about" variant="secondary">
              {t("About CAISBE", "À propos du CAISBE")}
            </ButtonLink>
          </>
        }
      >
        <p className={heroNoteClassName}>{intro}</p>
      </PageHero>

      <ContentSection
        title={t("Current initiatives", "Initiatives en cours")}
        description={t(
          "A snapshot of active, planned, and completed work across the institute.",
          "Un aperçu des travaux actifs, planifiés et terminés à l’Institut.",
        )}
        wide
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <ContentCard
              key={item.title}
              title={item.title}
              meta={`${item.status} · ${item.region}`}
              description={item.summary}
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
      </ContentSection>
    </>
  );
}
