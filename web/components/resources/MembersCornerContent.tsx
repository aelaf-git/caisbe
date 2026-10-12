import {
  ContentSection,
  FeatureList,
  PageHero,
  SubsectionIndex,
} from "@/components/pages/ContentPage";
import { getMediaItem, mediaContent } from "@/lib/data/resources";
import { fetchPublishedSitePage } from "@/lib/sitePages";

export async function MediaIndexContent() {
  const page = await fetchPublishedSitePage("/resources/media");
  return (
    <SubsectionIndex
      eyebrow="Resources"
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

export function MediaItemContent({ slug }: { slug: string }) {
  const item = getMediaItem(slug);
  if (!item) return null;

  return (
    <>
      <PageHero
        eyebrow="Media"
        title={item.title}
        lead={item.lead}
      />
      <ContentSection title="What to expect">
        <FeatureList items={item.highlights} />
      </ContentSection>
    </>
  );
}

/** @deprecated Use MediaItemContent */
export const MembersCornerItemContent = MediaItemContent;
