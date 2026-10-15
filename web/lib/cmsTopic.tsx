import TopicPageContent from "@/components/pages/TopicPageContent";
import { localeAlternates } from "@/lib/i18n/seo";
import { getServerLocale } from "@/lib/i18n/server";
import { fetchPublishedSitePage, topicChrome } from "@/lib/sitePages";

/** Render a published Admin Pages entry, or null so the route can keep its fallback layout. */
export async function cmsTopicPage(path: string) {
  const page = await fetchPublishedSitePage(path);
  if (!page) return null;
  const chrome = topicChrome(path);
  return (
    <TopicPageContent
      eyebrow={chrome.eyebrow}
      page={page}
      indexHref={chrome.indexHref}
      indexLabel={chrome.indexLabel}
    />
  );
}

export async function cmsTopicMetadata(path: string, fallbackTitle: string) {
  const page = await fetchPublishedSitePage(path);
  if (!page) return null;
  const locale = await getServerLocale();
  return {
    title: `${page.title} | CAISBE`,
    description: page.description || fallbackTitle,
    ...localeAlternates(path, locale),
  };
}
