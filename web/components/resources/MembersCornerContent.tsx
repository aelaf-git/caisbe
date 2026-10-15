import {
  ContentSection,
  FeatureList,
  PageHero,
  SubsectionIndex,
} from "@/components/pages/ContentPage";
import { getMediaContent, getMediaItem } from "@/lib/data/resources";
import { getServerT } from "@/lib/i18n/server";
import { fetchPublishedSitePage } from "@/lib/sitePages";

export async function MediaIndexContent() {
  const { t, locale } = await getServerT();
  const mediaContent = getMediaContent(locale);
  const page = await fetchPublishedSitePage("/resources/media");
  return (
    <SubsectionIndex
      eyebrow={t("Resources", "Ressources")}
      title={page?.title?.trim() || mediaContent.title}
      description={page?.lead?.trim() || mediaContent.description}
      items={mediaContent.items.map((item) => ({
        title: item.title,
        description: item.description,
        href: `/resources/${item.slug}`,
      }))}
    />
  );
}

/** @deprecated Use MediaIndexContent */
export const MembersCornerIndexContent = MediaIndexContent;

export async function MediaItemContent({ slug }: { slug: string }) {
  const { t, locale } = await getServerT();
  const item = getMediaItem(slug, locale);
  if (!item) return null;

  return (
    <>
      <PageHero
        eyebrow={t("Media", "Médias")}
        title={item.title}
        lead={item.lead}
      />
      <ContentSection title={t("What to expect", "À quoi s’attendre")}>
        <FeatureList items={item.highlights} />
      </ContentSection>
    </>
  );
}

/** @deprecated Use MediaItemContent */
export const MembersCornerItemContent = MediaItemContent;
