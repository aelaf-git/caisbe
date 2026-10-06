import ButtonLink from "@/components/ui/ButtonLink";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import { ticketsContent, ticketsPortalLoginUrl } from "@/lib/data/tickets";

export default function TicketsPageContent() {
  return (
    <>
      <PageHero
        eyebrow={ticketsContent.eyebrow}
        title={ticketsContent.title}
        lead={ticketsContent.lead}
        actions={
          <ButtonLink href={ticketsPortalLoginUrl()} variant="primary">
            {ticketsContent.ctaLabel}
          </ButtonLink>
        }
      />
      <ContentSection className="!py-16 md:!py-20">
        <p className="max-w-3xl text-base leading-8 text-caisbe-text md:text-lg">
          {ticketsContent.body}
        </p>
        <div className="mt-8">
          <ButtonLink href={ticketsPortalLoginUrl()} variant="secondary">
            {ticketsContent.ctaLabel}
          </ButtonLink>
        </div>
      </ContentSection>
    </>
  );
}
