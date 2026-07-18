import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MembershipSubpageContent } from "@/components/membership/MembershipPageContent";
import {
  getMembershipPage,
  membershipSlugs,
  type MembershipSlug,
} from "@/lib/data/membership";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return membershipSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getMembershipPage(slug);
  if (!page) return { title: "Membership | CAISBE" };
  return {
    title: `${page.title} | CAISBE`,
    description: page.title,
  };
}

export default async function MembershipSubpage({ params }: Props) {
  const { slug } = await params;
  const page = getMembershipPage(slug);
  if (!page) notFound();

  return <MembershipSubpageContent slug={slug as MembershipSlug} />;
}
