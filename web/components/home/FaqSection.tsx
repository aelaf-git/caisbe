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
    <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-caisbe-red">
            {faqIntro.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-caisbe-text-dark md:text-4xl">
            {faqIntro.title}
          </h1>
        </div>

        <div className="mt-12 overflow-hidden rounded-xl border border-ifma-border bg-white">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group border-b border-ifma-border last:border-b-0"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-[#fafafa] marker:content-none group-open:bg-[#fafafa] [&::-webkit-details-marker]:hidden">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-caisbe-red transition-transform group-open:rotate-180">
                  <ChevronIcon />
                </span>
                <h3 className="flex-1 text-base font-semibold leading-snug text-caisbe-text-dark md:text-lg">
                  {faq.question}
                </h3>
              </summary>
              <div className="px-5 pb-6 pl-[3.75rem]">
                {faq.answer.length === 1 ? (
                  <p className="text-sm leading-7 text-caisbe-muted">{faq.answer[0]}</p>
                ) : (
                  <ul className="space-y-2">
                    {faq.answer.map((line) => (
                      <li key={line} className="flex gap-3 text-sm leading-7 text-caisbe-muted">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-caisbe-red" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
