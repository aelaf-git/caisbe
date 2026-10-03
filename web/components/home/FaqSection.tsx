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
        className="pb-8 md:pb-10"
        eyebrow={faqIntro.eyebrow}
        title={faqIntro.title}
        lead="Answers about CAISBE programs, learning, membership, and how to get started."
      />
      <ContentSection className="!pt-6 md:!pt-8">
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-[20px] bg-white shadow-hopewell"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 text-left marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-caisbe-red/10 text-caisbe-red transition-transform group-open:rotate-180">
                  <ChevronIcon />
                </span>
                <h3 className="font-hopewell-display flex-1 text-base font-bold leading-snug text-caisbe-text-dark md:text-lg">
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
