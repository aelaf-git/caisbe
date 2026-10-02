import { PageHero } from "@/components/pages/ContentPage";
import { siteName } from "@/lib/data/home";

type UnderConstructionProps = {
  title: string;
  backHref?: string;
  backLabel?: string;
};

export default function UnderConstruction({
  title,
  backHref = "/",
  backLabel = "Back to home",
}: UnderConstructionProps) {
  return (
    <PageHero
      eyebrow="Under Construction"
      title={title}
      lead={`${siteName} is preparing this content. Please check back soon.`}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
