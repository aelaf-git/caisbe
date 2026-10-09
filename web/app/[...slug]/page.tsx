import TopicPageContent from "@/components/pages/TopicPageContent";
import UnderConstruction from "@/components/pages/UnderConstruction";
import { slugToTitle } from "@/lib/routes";
import { fetchPublishedSitePage, topicChrome } from "@/lib/sitePages";

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  const published = await fetchPublishedSitePage(path);
  if (published) {
    return {
      title: `${published.title} | CAISBE`,
      description: published.description,
    };
  }
  const title = slugToTitle(slug);
  return {
    title: `${title} | CAISBE`,
  };
}

export default async function CatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  const published = await fetchPublishedSitePage(path);
  if (published) {
    const chrome = topicChrome(path);
    return (
      <TopicPageContent
        eyebrow={chrome.eyebrow}
        page={published}
        indexHref={chrome.indexHref}
        indexLabel={chrome.indexLabel}
      />
    );
  }
  const title = slugToTitle(slug);

  return <UnderConstruction title={title} />;
}
