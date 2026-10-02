import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import { projectsContent } from "@/lib/data/projects";

export default function ProjectsPageContent() {
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
              Partner With Us
            </ButtonLink>
            <ButtonLink href="/professional-development" variant="secondary">
              Professional Development
            </ButtonLink>
            <ButtonLink href="/about" variant="secondary">
              About CAISBE
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">{intro}</p>
      </PageHero>

      <ContentSection
        title="Current initiatives"
        description="A snapshot of active, planned, and completed work across the institute."
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
