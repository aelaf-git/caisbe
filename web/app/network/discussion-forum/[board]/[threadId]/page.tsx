import type { Metadata } from "next";
import DiscussionThread from "@/components/network/DiscussionThread";

type Props = { params: Promise<{ board: string; threadId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Discussion | CAISBE",
    description: "Read a discussion on the CAISBE forum.",
  };
}

export default async function DiscussionThreadPage({ params }: Props) {
  const { board, threadId } = await params;
  return <DiscussionThread boardSlug={board} threadId={threadId} />;
}
