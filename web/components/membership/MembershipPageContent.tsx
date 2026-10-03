"use client";

import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
  SubsectionIndex,
} from "@/components/pages/ContentPage";
import {
  membershipIndexItems,
  membershipPages,
  type MembershipSlug,
} from "@/lib/data/membership";
import { portalMembershipLoginUrl, portalMembershipRegisterUrl } from "@/lib/api";

export function MembershipIndexContent() {
  return (
    <SubsectionIndex
      eyebrow="Membership"
      title="Membership"
      description="Join CAISBE for professional benefits, community, and pathways into facility management excellence."
      items={membershipIndexItems}
    />
  );
}

export function BecomeAMemberContent({
  eyebrow = "Membership",
  title,
  lead,
}: {
  initialPath?: "new" | "existing" | null;
  eyebrow?: string;
  title?: string;
  lead?: string;
}) {
  const page = membershipPages["become-a-member"];
  const registerHref = portalMembershipRegisterUrl();
  const loginHref = portalMembershipLoginUrl();

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title ?? page.title}
        lead={lead ?? page.description}
      />
      <ContentSection wide>
        <div className="mx-auto max-w-2xl rounded-[20px] bg-white p-8 text-center shadow-hopewell">
          <h2 className="font-hopewell-display text-2xl font-extrabold text-caisbe-text-dark">
            Login or create your student account
          </h2>
          <p className="mt-3 text-sm leading-6 text-caisbe-muted">
            New accounts are student members immediately, with a downloadable membership
            certificate in the portal. Log in if you already have an account to renew or upgrade.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <ButtonLink href={registerHref} variant="primary">
              Create account
            </ButtonLink>
            <ButtonLink href={loginHref} variant="secondary">
              Login
            </ButtonLink>
          </div>
        </div>
      </ContentSection>
    </>
  );
}

export function MembershipSubpageContent({ slug }: { slug: MembershipSlug }) {
  if (slug === "overview") {
    const page = membershipPages.overview;
    return (
      <PageHero
        eyebrow="Membership"
        title={page.title}
        lead={page.paragraphs[0]}
        actions={
          <>
            <ButtonLink href={portalMembershipRegisterUrl()} variant="primary">
              Join Now
            </ButtonLink>
            <ButtonLink href="/membership/types" variant="secondary">
              Membership Types
            </ButtonLink>
          </>
        }
      >
        {page.paragraphs.slice(1).map((paragraph) => (
          <p
            key={paragraph.slice(0, 40)}
            className="mt-6 text-base leading-7 text-caisbe-muted"
          >
            {paragraph}
          </p>
        ))}
      </PageHero>
    );
  }

  if (slug === "join") {
    const page = membershipPages.join;
    return (
      <BecomeAMemberContent
        eyebrow={page.eyebrow}
        title={page.title}
        lead={page.description}
      />
    );
  }

  if (slug === "types") {
    const page = membershipPages.types;
    return (
      <>
        <PageHero eyebrow={page.eyebrow} title={page.title} />
        <ContentSection wide>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {page.items.map((item, index) => (
              <ContentCard
                key={item.title}
                title={item.title}
                description={item.description}
                style={{ animationDelay: `${index * 70}ms` }}
              />
            ))}
          </div>
          <div className="mt-10">
            <ButtonLink href={portalMembershipRegisterUrl()} variant="primary">
              Become a Member
            </ButtonLink>
          </div>
        </ContentSection>
      </>
    );
  }

  return <BecomeAMemberContent />;
}
