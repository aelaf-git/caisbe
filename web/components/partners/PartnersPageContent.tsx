import ButtonLink from "@/components/ui/ButtonLink";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import { partnersContent } from "@/lib/data/partners";

export default function PartnersPageContent() {
  const {
    eyebrow,
    title,
    lead,
    intro,
    benefitsTitle,
    benefitsBody,
    howItWorksTitle,
    howItWorksBody,
    thankYouTitle,
    thankYouLead,
    contactEmail,
    ctaLabel,
  } = partnersContent;

  const mailtoHref = `mailto:${contactEmail}?subject=${encodeURIComponent("Partnership inquiry")}`;

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        actions={
          <ButtonLink href={mailtoHref} variant="primary">
            {ctaLabel}
          </ButtonLink>
        }
      />

      <ContentSection className="!py-20 md:!py-24">
        <p className="max-w-3xl text-base leading-8 text-caisbe-text md:text-lg">
          {intro}
        </p>
      </ContentSection>

      <ContentSection
        id="benefits"
        title={benefitsTitle}
        description={benefitsBody}
        className="!py-20 md:!py-24 bg-[#fafafa]"
      />

      <ContentSection
        id="how-it-works"
        title={howItWorksTitle}
        description={howItWorksBody}
        className="!py-20 md:!py-24"
      >
        <div>
          <ButtonLink href={mailtoHref} variant="primary">
            {ctaLabel}
          </ButtonLink>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-caisbe-muted">
            Prefer to write us directly? Email{" "}
            <a
              href={mailtoHref}
              className="font-semibold text-caisbe-red underline-offset-2 hover:underline"
            >
              {contactEmail}
            </a>
            .
          </p>
        </div>
      </ContentSection>

      <ContentSection
        title={thankYouTitle}
        description={thankYouLead}
        className="!py-20 md:!py-24 bg-[#fafafa]"
      />
    </>
  );
}
