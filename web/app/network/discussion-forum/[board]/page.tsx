import type { Metadata } from "next";
import DiscussionBoard from "@/components/network/DiscussionBoard";
import { getServerT } from "@/lib/i18n/server";

type Props = { params: Promise<{ board: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { board } = await params;
  const { t } = await getServerT();
  const label = board.replace(/-/g, " ");
  return {
    title: `${label} | ${t("Discussion Forum", "Forum de discussion")} | CAISBE`,
    description: t("Read discussions on the CAISBE forum.", "Lisez les discussions du forum du CAISBE."),
  };
}

export default async function DiscussionBoardPage({ params }: Props) {
  const { board } = await params;
  return <DiscussionBoard slug={board} />;
}
