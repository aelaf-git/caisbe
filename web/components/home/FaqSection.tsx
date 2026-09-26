import { PageHero, ContentSection } from "@/components/pages/ContentPage";
import { faqIntro, faqs } from "@/lib/data/home";

function ChevronIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FaqSection() {
  return (
    <>
      <PageHero
        eyebrow={faqIntro.eyebrow}
        title={faqIntro.title}
        lead="Answers about CAISBE programs, learning, membership, and how to get started."
      />
      <ContentSection>
        <div className="overflow-hidden rounded-xl border border-ifma-border bg-white shadow-brand-card">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group border-b border-ifma-border last:border-b-0"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-[#f8fafc] marker:content-none group-open:bg-[#f8fafc] [&::-webkit-details-marker]:hidden">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-caisbe-red/20 bg-caisbe-red/5 text-caisbe-red transition-transform group-open:rotate-180">
                  <ChevronIcon />
                </span>
                <h3 className="font-display flex-1 text-base font-semibold leading-snug text-caisbe-text-dark md:text-lg">
                  {faq.question}
                </h3>
              </summary>
              <div className="px-5 pb-6 pl-[3.75rem]">
                {faq.answer.length === 1 ? (
                  <p className="text-base leading-8 text-caisbe-text">
                    {faq.answer[0]}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {faq.answer.map((line) => (
                      <li
                        key={line}
                        className="flex gap-3 text-base leading-8 text-caisbe-text"
                      >
                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-caisbe-red" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          ))}
        </div>
      </ContentSection>
    </>
  );
}
