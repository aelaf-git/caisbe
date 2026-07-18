import { faqIntro, faqs } from "@/lib/data/home";

export default function FaqSection() {
  return (
    <section id="faq" className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center">
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            {faqIntro.eyebrow}
          </p>
          <h2 className="brand-section-title mt-3 text-3xl font-semibold">
            {faqIntro.title}
          </h2>
        </div>

        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-lg border border-ifma-border-light border-l-4 border-l-caisbe-green bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 text-left marker:content-none [&::-webkit-details-marker]:hidden">
                <h3 className="text-lg font-semibold text-caisbe-green">
                  {faq.question}
                </h3>
                <span
                  className="shrink-0 text-xl font-light leading-none text-caisbe-red group-open:hidden"
                  aria-hidden
                >
                  +
                </span>
                <span
                  className="hidden shrink-0 text-xl font-light leading-none text-caisbe-red group-open:inline"
                  aria-hidden
                >
                  −
                </span>
              </summary>
              <ul className="space-y-2 border-t border-ifma-border-light px-6 pb-6 pt-4">
                {faq.answer.map((line) => (
                  <li
                    key={line}
                    className="text-sm leading-6 text-caisbe-muted before:mr-2 before:text-caisbe-red before:content-['•']"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
