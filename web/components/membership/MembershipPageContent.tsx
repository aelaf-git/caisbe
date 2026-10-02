"use client";

import { useState } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
  SubsectionIndex,
} from "@/components/pages/ContentPage";
import MembershipRegistrationForm from "@/components/membership/MembershipRegistrationForm";
import MembershipRenewalForm from "@/components/membership/MembershipRenewalForm";
import {
  membershipIndexItems,
  membershipPages,
  type MembershipSlug,
} from "@/lib/data/membership";

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

function MemberPathCard({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border-2 p-6 text-left transition-colors ${
        selected
          ? "border-caisbe-red bg-caisbe-red/5 shadow-brand-card"
          : "border-ifma-border bg-white hover:border-caisbe-red"
      }`}
    >
      <span
        className={`inline-flex h-12 w-12 items-center justify-center rounded-md text-lg font-bold ${
          selected
            ? "bg-caisbe-red text-white"
            : "bg-[#fafafa] text-caisbe-red"
        }`}
      >
        {title.startsWith("New") ? "N" : "E"}
      </span>
      <h3 className="mt-4 font-display text-xl font-semibold text-caisbe-text-dark">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-caisbe-muted">{description}</p>
    </button>
  );
}

export function BecomeAMemberContent({
  initialPath = null,
}: {
  initialPath?: "new" | "existing" | null;
}) {
  const page = membershipPages["become-a-member"];
  const [path, setPath] = useState<"new" | "existing" | null>(initialPath);

  return (
    <>
      <PageHero
        eyebrow="Membership"
        title={page.title}
        lead={page.description}
      />
      <ContentSection wide>
        <div className="grid gap-6 md:grid-cols-2">
          <MemberPathCard
            title="New Member"
            description="Register for CAISBE membership. Fill the form online or download it, complete it, and upload."
            selected={path === "new"}
            onSelect={() => setPath("new")}
          />
          <MemberPathCard
            title="Existing Member"
            description="Renew your membership online, or download the renewal form, complete it, and upload."
            selected={path === "existing"}
            onSelect={() => setPath("existing")}
          />
        </div>

        <div className="mt-10">
          {path === "new" ? <MembershipRegistrationForm /> : null}
          {path === "existing" ? <MembershipRenewalForm /> : null}
          {path == null ? (
            <p className="text-center text-sm text-caisbe-muted">
              Choose New Member or Existing Member to continue.
            </p>
          ) : null}
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
            <ButtonLink href="/membership/become-a-member" variant="primary">
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
      <>
        <PageHero
          eyebrow={page.eyebrow}
          title={page.title}
          lead={page.paragraphs[0]}
          actions={
            <>
              <ButtonLink href="/membership/become-a-member" variant="primary">
                Become a Member
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
        <ContentSection>
          <MembershipRegistrationForm title="Join CAISBE" />
        </ContentSection>
      </>
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
            <ButtonLink href="/membership/become-a-member" variant="primary">
              Become a Member
            </ButtonLink>
          </div>
        </ContentSection>
      </>
    );
  }

  return <BecomeAMemberContent />;
}
