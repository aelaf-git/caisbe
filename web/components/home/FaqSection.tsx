import { faqIntro, faqs } from "@/lib/data/home";

export default function FaqSection() {
  return (
    <section className="bg-ifma-surface py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-ifma-blue">
            {faqIntro.eyebrow}
          </p>
          <h2 className="ifma-section-title mt-3 text-3xl font-semibold">
            {faqIntro.title}
          </h2>
        </div>

        <div className="mt-10 space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="border border-ifma-border-light bg-white p-6"
            >
              <h3 className="text-lg font-semibold text-ifma-navy">
                {faq.question}
              </h3>
              <ul className="mt-4 space-y-2">
                {faq.answer.map((line) => (
                  <li
                    key={line}
                    className="text-sm leading-6 text-ifma-muted before:mr-2 before:content-['•']"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
