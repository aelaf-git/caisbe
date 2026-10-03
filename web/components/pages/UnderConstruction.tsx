import { PageHero } from "@/components/pages/ContentPage";
import { siteName } from "@/lib/data/home";

type UnderConstructionProps = {
  title: string;
};

export default function UnderConstruction({ title }: UnderConstructionProps) {
  return (
    <PageHero
      eyebrow="Under Construction"
      title={title}
      lead={`${siteName} is preparing this content. Please check back soon.`}
    />
  );
}
