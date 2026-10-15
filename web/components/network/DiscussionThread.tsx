import { PageHero } from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import { portalForumLoginUrl, portalForumRegisterUrl } from "@/lib/forum";
import { getServerT } from "@/lib/i18n/server";

export default async function DiscussionThread({
  boardSlug,
  threadId,
}: {
  boardSlug: string;
  threadId: string;
}) {
  const { t } = await getServerT();
  const nextPath = `/forum/${boardSlug}/${threadId}`;

  return (
    <PageHero
      eyebrow={t("Discussion Forum", "Forum de discussion")}
      title={t("Sign in to read this discussion", "Connectez-vous pour lire cette discussion")}
      lead={t(
        "Discussions are available to signed-in students. Log in or register to open this thread in the student portal.",
        "Les discussions sont accessibles aux étudiants connectés. Connectez-vous ou inscrivez-vous pour ouvrir ce fil dans le portail étudiant.",
      )}
      backHref={`/network/discussion-forum/${boardSlug}`}
      backLabel={t("Back to board", "Retour au forum")}
      actions={
        <>
          <ButtonLink href={portalForumLoginUrl(nextPath)} variant="primary">
            {t("Login", "Connexion")}
          </ButtonLink>
          <ButtonLink href={portalForumRegisterUrl(nextPath)} variant="secondary">
            {t("Register", "S’inscrire")}
          </ButtonLink>
        </>
      }
    />
  );
}
