import type { Metadata } from "next";
import DiscussionThread from "@/components/network/DiscussionThread";
import { getServerT } from "@/lib/i18n/server";

type Props = { params: Promise<{ board: string; threadId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("Discussion | CAISBE", "Discussion | CAISBE"),
    description: t("Read a discussion on the CAISBE forum.", "Lisez une discussion du forum du CAISBE."),
  };
}

export default async function DiscussionThreadPage({ params }: Props) {
  const { board, threadId } = await params;
  return <DiscussionThread boardSlug={board} threadId={threadId} />;
}
