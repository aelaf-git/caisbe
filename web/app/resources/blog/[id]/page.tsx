import type { Metadata } from "next";
import BlogPostPageContent from "@/components/resources/BlogPostPageContent";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Blog | CAISBE`,
    description: `CAISBE blog post ${id}`,
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
