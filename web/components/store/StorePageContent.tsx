import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import { storeContent } from "@/lib/data/store";

export default function StorePageContent() {
  const { eyebrow, title, lead, intro, categories, featured, howToOrder } =
    storeContent;

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        actions={
          <>
            <ButtonLink href="/contact" variant="primary">
              Order / Inquire
            </ButtonLink>
            <ButtonLink href="/membership" variant="secondary">
              Become a Member
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">{intro}</p>
      </PageHero>

      <ContentSection
        title="Browse by category"
        description="Start with the collection that matches how you learn and practice."
        wide
      >
        <div className="grid gap-6 md:grid-cols-3">
          {categories.map((category, index) => (
            <ContentCard
              key={category.title}
              title={category.title}
              description={category.description}
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
      </ContentSection>

      <ContentSection
        title="Featured titles"
        description="A sample of publications and guides available through CAISBE. Contact us to confirm stock and pricing."
        wide
      >
        <div className="grid gap-6 md:grid-cols-2">
          {featured.map((item, index) => (
            <ContentCard
              key={item.title}
              title={item.title}
              meta={item.category}
              description={item.description}
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
      </ContentSection>

      <ContentSection title={howToOrder.title}>
        <ol className="space-y-4">
          {howToOrder.steps.map((step, index) => (
            <li key={step} className="flex gap-4 text-base leading-7 text-caisbe-muted">
              <span className="font-display text-caisbe-red mt-0.5 text-lg font-semibold">
                {index + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <ButtonLink href="/contact" variant="primary">
            Contact the Bookstore
          </ButtonLink>
        </div>
      </ContentSection>
    </>
  );
}
