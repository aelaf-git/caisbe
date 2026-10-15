import type { Metadata } from "next";
import BlogPostPageContent from "@/components/resources/BlogPostPageContent";
import { getServerT } from "@/lib/i18n/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { t } = await getServerT();
  return {
    title: t("Blog | CAISBE", "Blogue | CAISBE"),
    description: t(`CAISBE blog post ${id}`, `Article du blogue du CAISBE ${id}`),
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId < 1) {
    return <BlogPostPageContent id={0} />;
  }
  return <BlogPostPageContent id={numericId} />;
}
