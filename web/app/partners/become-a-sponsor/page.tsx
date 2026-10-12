import type { Metadata } from "next";
import { PageHero } from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import { cmsTopicMetadata, cmsTopicPage } from "@/lib/cmsTopic";
import { sponsorContent } from "@/lib/data/partners";

export async function generateMetadata(): Promise<Metadata> {
  return (
    (await cmsTopicMetadata("/partners/become-a-sponsor", sponsorContent.lead)) ?? {
      title: sponsorContent.seoTitle,
      description: sponsorContent.lead,
    }
  );
}

export default async function BecomeASponsorPage() {
  const published = await cmsTopicPage("/partners/become-a-sponsor");
  if (published) return published;

  return (
    <PageHero
      eyebrow={sponsorContent.eyebrow}
      title={sponsorContent.title}
      lead={sponsorContent.lead}
      backHref="/partners"
      backLabel="Become a Partner"
      actions={
        <ButtonLink href={sponsorContent.ctaHref} variant="primary">
          {sponsorContent.ctaLabel}
        </ButtonLink>
      }
    />
  );
}
