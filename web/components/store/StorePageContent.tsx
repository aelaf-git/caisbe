import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import { storeContent } from "@/lib/data/store";
import { getServerT } from "@/lib/i18n/server";

export default async function StorePageContent() {
  const { t } = await getServerT();
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
              {t("Order / Inquire", "Commander / Se renseigner")}
            </ButtonLink>
            <ButtonLink href="/membership" variant="secondary">
              {t("Become a Member", "Devenir membre")}
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">{intro}</p>
      </PageHero>

      <ContentSection
        title={t("Browse by category", "Parcourir par catégorie")}
        description={t(
          "Start with the collection that matches how you learn and practice.",
          "Commencez par la collection qui correspond à votre façon d’apprendre et de pratiquer.",
        )}
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
        title={t("Featured titles", "Titres en vedette")}
        description={t(
          "A sample of publications and guides available through CAISBE. Contact us to confirm stock and pricing.",
          "Un échantillon de publications et de guides offerts par le CAISBE. Communiquez avec nous pour confirmer les stocks et les prix.",
        )}
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
              <span className="font-hopewell-display text-caisbe-red mt-0.5 text-lg font-bold">
                {index + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <ButtonLink href="/contact" variant="primary">
            {t("Contact the Bookstore", "Joindre la librairie")}
          </ButtonLink>
        </div>
      </ContentSection>
    </>
  );
}
