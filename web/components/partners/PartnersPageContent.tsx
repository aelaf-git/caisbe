import ButtonLink from "@/components/ui/ButtonLink";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import { partnersContent } from "@/lib/data/partners";

export default function PartnersPageContent() {
  const {
    eyebrow,
    title,
    lead,
    benefitsTitle,
    benefits,
    howItWorksTitle,
    steps,
    contactEmail,
    ctaLabel,
  } = partnersContent;

  const mailtoHref = `mailto:${contactEmail}?subject=${encodeURIComponent("Partnership inquiry")}`;

  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} lead={lead} />

      <ContentSection id="benefits" title={benefitsTitle}>
        <ul className="grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <li
              key={benefit.title}
              className="rounded-[20px] bg-white px-5 py-5 shadow-hopewell"
            >
              <h3 className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-caisbe-text">{benefit.description}</p>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection id="how-it-works" title={howItWorksTitle} className="bg-[#fafafa]">
        <ol className="grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-[20px] bg-white px-5 py-5 shadow-hopewell"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-caisbe-red">
                Step {index + 1}
              </p>
              <h3 className="font-hopewell-display mt-2 text-lg font-bold text-caisbe-text-dark">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-caisbe-text">{step.description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <ButtonLink href={mailtoHref} variant="primary">
            {ctaLabel}
          </ButtonLink>
        </div>
      </ContentSection>
    </>
  );
}
