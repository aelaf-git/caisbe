import type { Metadata } from "next";
import DiscussionBoard from "@/components/network/DiscussionBoard";

type Props = { params: Promise<{ board: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { board } = await params;
  const label = board.replace(/-/g, " ");
  return {
    title: `${label} | Discussion Forum | CAISBE`,
    description: "Read discussions on the CAISBE forum.",
  };
}

export default async function DiscussionBoardPage({ params }: Props) {
  const { board } = await params;
  return <DiscussionBoard slug={board} />;
}
