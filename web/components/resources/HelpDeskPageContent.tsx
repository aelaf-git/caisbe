"use client";

import { useDeferredValue, useMemo, useState } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import { helpDeskContent } from "@/lib/data/helpDesk";
import { faqs } from "@/lib/data/home";

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

function matchesQuery(question: string, answer: string[], query: string) {
  const haystack = `${question} ${answer.join(" ")}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export default function HelpDeskPageContent() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const filtered = useMemo(() => {
    if (!deferredQuery) return faqs;
    return faqs.filter((faq) => matchesQuery(faq.question, faq.answer, deferredQuery));
  }, [deferredQuery]);

  return (
    <>
      <PageHero
        eyebrow={helpDeskContent.eyebrow}
        title={helpDeskContent.title}
        lead={helpDeskContent.lead}
        actions={
          <ButtonLink href={helpDeskContent.contactHref} variant="secondary">
            {helpDeskContent.contactLabel}
          </ButtonLink>
        }
      />

      <ContentSection className="!pt-6 md:!pt-8 !pb-20 md:!pb-24">
        <label className="block max-w-2xl">
          <span className="sr-only">Search FAQs</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-caisbe-muted">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="m20 20-3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={helpDeskContent.searchPlaceholder}
              className="w-full rounded-full border border-ifma-border bg-white py-3.5 pl-12 pr-5 text-base text-caisbe-text shadow-hopewell outline-none transition placeholder:text-caisbe-muted/70 focus:border-caisbe-red focus:ring-2 focus:ring-caisbe-red/20"
            />
          </div>
        </label>

        <p className="mt-4 text-sm font-medium text-caisbe-muted">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
          {deferredQuery ? ` for “${deferredQuery}”` : ""}
        </p>

        <div className="mt-6 grid gap-4">
          {filtered.length === 0 ? (
            <div className="rounded-[20px] bg-white px-5 py-8 shadow-hopewell">
              <p className="text-base leading-8 text-caisbe-text md:text-lg">
                {helpDeskContent.emptyResults}
              </p>
              <div className="mt-6">
                <ButtonLink href={helpDeskContent.contactHref} variant="primary">
                  {helpDeskContent.contactLabel}
                </ButtonLink>
              </div>
            </div>
          ) : (
            filtered.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-[20px] bg-white shadow-hopewell"
                open={Boolean(deferredQuery)}
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
            ))
          )}
        </div>
      </ContentSection>
    </>
  );
}
