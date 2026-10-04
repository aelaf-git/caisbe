import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import { partnersContent } from "@/lib/data/partners";

export default function PartnersPageContent() {
  const {
    eyebrow,
    title,
    lead,
    paragraphs,
    thankYouTitle,
    thankYouLead,
    contactEmail,
    ctaLabel,
  } = partnersContent;

  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} lead={lead} />

      <ContentSection wide>
        <div className="mx-auto max-w-3xl space-y-6">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-base leading-8 text-caisbe-text">
              {paragraph.includes(contactEmail) ? (
                <>
                  {paragraph.split(contactEmail)[0]}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="font-semibold text-caisbe-red underline-offset-2 hover:underline"
                  >
                    {contactEmail}
                  </a>
                  {paragraph.split(contactEmail)[1]}
                </>
              ) : (
                paragraph
              )}
            </p>
          ))}
          <div className="pt-2">
            <ButtonLink href={`mailto:${contactEmail}`} variant="primary">
              {ctaLabel}
            </ButtonLink>
          </div>
        </div>
      </ContentSection>

      <ContentSection title={thankYouTitle} description={thankYouLead} />
    </>
  );
}
