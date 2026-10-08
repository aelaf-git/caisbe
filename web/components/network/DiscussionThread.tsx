import { PageHero } from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import { portalForumLoginUrl, portalForumRegisterUrl } from "@/lib/forum";

export default function DiscussionThread({
  boardSlug,
  threadId,
}: {
  boardSlug: string;
  threadId: string;
}) {
  const nextPath = `/forum/${boardSlug}/${threadId}`;

  return (
    <PageHero
      eyebrow="Discussion Forum"
      title="Sign in to read this discussion"
      lead="Discussions are available to signed-in students. Log in or register to open this thread in the student portal."
      backHref={`/network/discussion-forum/${boardSlug}`}
      backLabel="Back to board"
      actions={
        <>
          <ButtonLink href={portalForumLoginUrl(nextPath)} variant="primary">
            Login
          </ButtonLink>
          <ButtonLink href={portalForumRegisterUrl(nextPath)} variant="secondary">
            Register
          </ButtonLink>
        </>
      }
    />
  );
}
