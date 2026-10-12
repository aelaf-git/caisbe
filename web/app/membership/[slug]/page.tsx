import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MembershipSubpageContent } from "@/components/membership/MembershipPageContent";
import {
  getMembershipPage,
  membershipSlugs,
  type MembershipSlug,
} from "@/lib/data/membership";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return membershipSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const published = await cmsTopicMetadata(`/membership/${slug}`, "Membership | CAISBE");
  if (published) return published;

  const page = getMembershipPage(slug);
  if (page) {
    return {
      title: `${page.title} | CAISBE`,
      description: page.description,
    };
  }
  return { title: "Membership | CAISBE" };
}

export default async function MembershipSubpage({ params }: Props) {
  const { slug } = await params;
  const cms = await cmsTopicPage(`/membership/${slug}`);
  if (cms) return cms;

  const page = getMembershipPage(slug);
  if (!page) notFound();
  return <MembershipSubpageContent slug={slug as MembershipSlug} />;
}
