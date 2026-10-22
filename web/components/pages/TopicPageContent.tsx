import Link from "next/link";
import type { ReactNode } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  FeatureList,
  PageHero,
  heroNoteClassName,
} from "@/components/pages/ContentPage";
import type { TopicPage } from "@/lib/data/site-pages";
import { translateLabel } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

const JOIN_HREF = "/membership/forms/application";
const RENEW_HREF = "/membership/forms/renewal";

const MEMBERSHIP_PROCEED_LINKS: { phrase: string; href: string }[] = [
  { phrase: "Join Now", href: JOIN_HREF },
  { phrase: "Renew Membership", href: RENEW_HREF },
  { phrase: "Adhérer maintenant", href: JOIN_HREF },
  { phrase: "Renouveler l’adhésion", href: RENEW_HREF },
  { phrase: "Renouveler l'adhésion", href: RENEW_HREF },
];

const proceedLinkClass =
  "font-semibold text-blue-700 underline decoration-blue-700/80 underline-offset-2 hover:text-blue-800";

function linkifyMembershipProceedBody(body: string): ReactNode {
  type Piece = { type: "text"; value: string } | { type: "link"; value: string; href: string };
  let pieces: Piece[] = [{ type: "text", value: body }];

  for (const { phrase, href } of MEMBERSHIP_PROCEED_LINKS) {
    const next: Piece[] = [];
    for (const piece of pieces) {
      if (piece.type === "link") {
        next.push(piece);
        continue;
      }
      const parts = piece.value.split(phrase);
      parts.forEach((part, index) => {
        if (part) next.push({ type: "text", value: part });
        if (index < parts.length - 1) {
          next.push({ type: "link", value: phrase, href });
        }
      });
    }
    pieces = next;
  }

  return pieces.map((piece, index) =>
    piece.type === "link" ? (
      <Link key={`${piece.href}-${index}`} href={piece.href} className={proceedLinkClass}>
        {piece.value}
      </Link>
    ) : (
      <span key={`t-${index}`}>{piece.value}</span>
    ),
  );
}

type TopicPageContentProps = {
  eyebrow: string;
  page: TopicPage;
  indexHref: string;
  indexLabel: string;
};

export default async function TopicPageContent({
  eyebrow,
  page,
  indexHref,
  indexLabel,
}: TopicPageContentProps) {
  const locale = await getServerLocale();
  return (
    <>
      <PageHero
        eyebrow={translateLabel(eyebrow, locale)}
        title={page.title}
        lead={page.lead}
        backHref={indexHref}
        backLabel={translateLabel(indexLabel, locale)}
        actions={
          page.ctaLabel && page.ctaHref ? (
            <ButtonLink href={page.ctaHref} variant="primary">
              {page.ctaLabel}
            </ButtonLink>
          ) : undefined
        }
      >
        {page.description ? (
          <p className={heroNoteClassName}>{page.description}</p>
        ) : null}
      </PageHero>

      {page.sections.map((section) => (
        <ContentSection key={section.title} title={section.title}>
          {section.body ? (
            <p className="text-base leading-7 text-caisbe-text sm:text-lg sm:leading-8">
              {page.slug === "become-a-member"
                ? linkifyMembershipProceedBody(section.body)
                : section.body}
            </p>
          ) : null}
          {section.items?.length ? (
            <div className={section.body ? "mt-6" : undefined}>
              <FeatureList items={section.items} />
            </div>
          ) : null}
          {page.slug === "board-of-directors" && section === page.sections[page.sections.length - 1] ? (
            <div className="mt-6">
              <ButtonLink href="/contact" variant="primary">
                {locale === "fr" ? "Nous joindre" : "Contact us"}
              </ButtonLink>
            </div>
          ) : null}
        </ContentSection>
      ))}
    </>
  );
}
