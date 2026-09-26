import { SubsectionIndex } from "@/components/pages/ContentPage";
import type { PlaceholderPage } from "@/lib/data/site-pages";

/** Index helper retained for optional hub layouts; marketed routes use TopicPageContent. */
export function PlaceholderIndexContent({
  eyebrow,
  title,
  description,
  items,
  basePath,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: PlaceholderPage[];
  basePath: string;
}) {
  return (
    <SubsectionIndex
      eyebrow={eyebrow}
      title={title}
      description={description}
      items={items.map((item) => ({
        title: item.title,
        description: item.description,
        href: `${basePath}/${item.slug}`,
      }))}
    />
  );
}
