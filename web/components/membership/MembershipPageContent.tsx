"use client";

import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentCard,
  ContentSection,
  PageHero,
  SubsectionIndex,
  heroNoteClassName,
} from "@/components/pages/ContentPage";
import {
  membershipIndexItems,
  membershipPages,
  type MembershipSlug,
} from "@/lib/data/membership";
import { portalMembershipLoginUrl, portalMembershipRegisterUrl } from "@/lib/api";
import { useT } from "@/lib/i18n/LocaleProvider";

export function MembershipIndexContent() {
  const t = useT();
  return (
    <SubsectionIndex
      eyebrow={t("Membership", "Adhésion")}
      title={t("Membership", "Adhésion")}
      description={t(
        "Join CAISBE for professional benefits, community, and pathways into facility management excellence.",
        "Joignez le CAISBE pour des avantages professionnels, une communauté et des parcours vers l’excellence en gestion des installations.",
      )}
      items={membershipIndexItems}
    />
  );
}

export function BecomeAMemberContent({
  eyebrow,
  title,
  lead,
}: {
  initialPath?: "new" | "existing" | null;
  eyebrow?: string;
  title?: string;
  lead?: string;
}) {
  const t = useT();
  const page = membershipPages["become-a-member"];
  const registerHref = portalMembershipRegisterUrl();
  const loginHref = portalMembershipLoginUrl();

  return (
    <>
      <PageHero
        eyebrow={eyebrow ?? t("Membership", "Adhésion")}
        title={title ?? page.title}
        lead={lead ?? page.description}
      />
      <ContentSection wide>
        <div className="mx-auto max-w-2xl rounded-[20px] bg-white p-8 text-center shadow-hopewell">
          <h2 className="font-hopewell-display text-2xl font-extrabold text-caisbe-text-dark">
            {t("Login or create your student account", "Connectez-vous ou créez votre compte étudiant")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-caisbe-muted">
            {t(
              "New accounts are student members immediately, with a downloadable membership certificate in the portal. Log in if you already have an account to renew or upgrade.",
              "Les nouveaux comptes deviennent immédiatement membres étudiants, avec un certificat d’adhésion téléchargeable dans le portail. Connectez-vous si vous avez déjà un compte pour renouveler ou passer à une catégorie supérieure.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <ButtonLink href={registerHref} variant="primary">
              {t("Create account", "Créer un compte")}
            </ButtonLink>
            <ButtonLink href={loginHref} variant="secondary">
              {t("Login", "Connexion")}
            </ButtonLink>
          </div>
        </div>
      </ContentSection>
    </>
  );
}

export function MembershipSubpageContent({ slug }: { slug: MembershipSlug }) {
  const t = useT();
  if (slug === "overview") {
    const page = membershipPages.overview;
    return (
      <PageHero
        eyebrow={t("Membership", "Adhésion")}
        title={page.title}
        lead={page.paragraphs[0]}
        actions={
          <>
            <ButtonLink href={portalMembershipRegisterUrl()} variant="primary">
              {t("Join Now", "Adhérer maintenant")}
            </ButtonLink>
            <ButtonLink href="/membership/types" variant="secondary">
              {t("Membership Types", "Types d’adhésion")}
            </ButtonLink>
          </>
        }
      >
        {page.paragraphs.slice(1).map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className={heroNoteClassName}>
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
              {t("Become a Member", "Devenir membre")}
            </ButtonLink>
          </div>
        </ContentSection>
      </>
    );
  }

  return <BecomeAMemberContent />;
}
