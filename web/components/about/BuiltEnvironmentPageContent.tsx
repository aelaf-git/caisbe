import { PageHero, heroNoteClassName } from "@/components/pages/ContentPage";
import { aboutContent } from "@/lib/data/about";
import { getServerT } from "@/lib/i18n/server";

export default async function BuiltEnvironmentPageContent() {
  const { t } = await getServerT();
  const { builtEnvironment } = aboutContent;

  return (
    <PageHero
      eyebrow={t("About CAISBE", "À propos du CAISBE")}
      title={builtEnvironment.title}
      backHref="/about"
      backLabel={t("Back to about", "Retour à À propos")}
    >
      {builtEnvironment.paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 48)} className={heroNoteClassName}>
          {paragraph}
        </p>
      ))}
    </PageHero>
  );
}
