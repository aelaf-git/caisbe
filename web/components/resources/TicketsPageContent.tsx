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
            {ticketsContent.loginCtaLabel}
          </ButtonLink>
        }
      />

      <ContentSection className="!py-12 md:!py-16">
        <div className="overflow-x-auto rounded-[20px] bg-white shadow-hopewell">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ifma-border-light">
                {ticketsContent.tableHeaders.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-5 py-4 font-hopewell-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark md:px-6"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={ticketsContent.tableHeaders.length}
                  className="px-5 py-10 text-caisbe-muted md:px-6 md:text-base"
                >
                  <p className="max-w-2xl leading-7">{ticketsContent.tableEmpty}</p>
                  <div className="mt-6">
                    <ButtonLink href={ticketsPortalLoginUrl()} variant="secondary">
                      {ticketsContent.loginCtaLabel}
                    </ButtonLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ContentSection>

      <ContentSection
        title={ticketsContent.submitTitle}
        description={ticketsContent.submitBody}
        className="!py-12 md:!py-16 bg-[#fafafa]"
      >
        <ButtonLink href={ticketsPortalLoginUrl("/messages?compose=1")} variant="primary">
          {ticketsContent.submitCtaLabel}
        </ButtonLink>
      </ContentSection>
    </>
  );
}
