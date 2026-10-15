import { PageHero } from "@/components/pages/ContentPage";
import { siteName } from "@/lib/data/home";
import { getServerT } from "@/lib/i18n/server";

type UnderConstructionProps = {
  title: string;
};

export default async function UnderConstruction({ title }: UnderConstructionProps) {
  const { t } = await getServerT();
  return (
    <PageHero
      eyebrow={t("Under Construction", "En construction")}
      title={title}
      lead={t(
        `${siteName} is preparing this content. Please check back soon.`,
        `${siteName} prépare ce contenu. Revenez bientôt.`,
      )}
    />
  );
}
