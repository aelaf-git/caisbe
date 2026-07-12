"use client";

import { useState } from "react";
import { faqIntro, faqs } from "@/lib/data/home";

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-ifma-border-light border-l-4 border-l-caisbe-green bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 p-6 text-left"
      >
        <h3 className="text-lg font-semibold text-caisbe-green">{question}</h3>
        <span
          className="shrink-0 text-xl font-light leading-none text-caisbe-red"
          aria-hidden
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <ul className="space-y-2 border-t border-ifma-border-light px-6 pb-6 pt-4">
          {answer.map((line) => (
            <li
              key={line}
              className="text-sm leading-6 text-caisbe-muted before:mr-2 before:text-caisbe-red before:content-['•']"
            >
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
          {faqs.map((faq, index) => (
            <FaqItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() =>
                setOpenIndex((current) => (current === index ? null : index))
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
