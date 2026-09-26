import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import { formatNewsDate, newsContent } from "@/lib/data/news";

export default function NewsPageContent() {
  const { eyebrow, title, lead, intro, items } = newsContent;

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        actions={
          <>
            <ButtonLink href="/contact" variant="primary">
              Media Inquiries
            </ButtonLink>
            <ButtonLink href="/events" variant="secondary">
              Upcoming Events
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-base leading-7 text-caisbe-muted">{intro}</p>
      </PageHero>

      <ContentSection
        title="Latest updates"
        description="Announcements are listed newest first. More stories will appear here as programs publish."
        wide
      >
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ifma-border bg-[#fafafa] px-6 py-12 text-center">
            <p className="text-base leading-7 text-caisbe-muted">
              No announcements yet. Check back soon, or contact us for the
              latest institute updates.
            </p>
            <div className="mt-6 flex justify-center">
              <ButtonLink href="/contact" variant="secondary">
                Contact Us
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {items.map((item, index) => (
              <ContentCard
                key={`${item.date}-${item.title}`}
                title={item.title}
                meta={
                  item.tag
                    ? `${formatNewsDate(item.date)} · ${item.tag}`
                    : formatNewsDate(item.date)
                }
                description={item.excerpt}
                style={{ animationDelay: `${index * 70}ms` }}
              />
            ))}
          </div>
        )}
      </ContentSection>
    </>
  );
}
