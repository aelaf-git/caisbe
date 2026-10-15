import DiscussionForumHome from "@/components/network/DiscussionForumHome";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  FeatureList,
  PageHero,
  SubsectionIndex,
  heroNoteClassName,
} from "@/components/pages/ContentPage";
import {
  networkIndexItems,
  networkPages,
  type NetworkSlug,
} from "@/lib/data/network";
import { getServerT } from "@/lib/i18n/server";

export async function NetworkIndexContent() {
  const { t } = await getServerT();
  return (
    <SubsectionIndex
      eyebrow={t("Network", "Réseau")}
      title={t("Network", "Réseau")}
      description={t(
        "Connect with CAISBE networking groups and join the African Facility Management Discussion Forum.",
        "Échangez avec les groupes de réseautage du CAISBE et joignez le forum de discussion africain sur la gestion des installations.",
      )}
      items={networkIndexItems}
    />
  );
}

export async function NetworkSubpageContent({ slug }: { slug: NetworkSlug }) {
  const { t } = await getServerT();
  const page = networkPages[slug];

  return (
    <>
      <PageHero
        eyebrow={t("Network", "Réseau")}
        title={page.title}
        lead={page.lead}
        actions={
          <>
            <ButtonLink href={page.ctaHref} variant="primary">
              {page.ctaLabel}
            </ButtonLink>
            <ButtonLink href="/network" variant="secondary">
              {t("Network Overview", "Aperçu du réseau")}
            </ButtonLink>
          </>
        }
      >
        {page.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className={heroNoteClassName}>
            {paragraph}
          </p>
        ))}
      </PageHero>
      {slug === "discussion-forum" ? <DiscussionForumHome /> : null}
      {page.benefits.length > 0 ? (
        <ContentSection title={t("Benefits of joining", "Avantages de l’adhésion")}>
          <FeatureList items={page.benefits} />
        </ContentSection>
      ) : null}
    </>
  );
}
