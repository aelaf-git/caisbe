import type { Metadata } from "next";
import { PageHero } from "@/components/pages/ContentPage";
import JobBoardList from "@/components/careers/JobBoardList";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("All Jobs | CAISBE Job Board", "Toutes les offres | Babillard d’emplois du CAISBE"),
    description: t(
      "Browse facility management jobs published by CAISBE across Canada, Africa, and global markets.",
      "Parcourez les emplois en gestion des installations publiés par le CAISBE au Canada, en Afrique et sur les marchés mondiaux.",
    ),
  };
}

export default async function AllJobsPage() {
  const { t } = await getServerT();
  return (
    <>
      <PageHero
        eyebrow={t("CAISBE Job Board", "Babillard d’emplois du CAISBE")}
        title={t("View All Jobs", "Voir toutes les offres")}
        lead={t(
          "Facility management opportunities published by CAISBE. Listings are removed automatically when their expiry date passes.",
          "Occasions en gestion des installations publiées par le CAISBE. Les offres sont retirées automatiquement à leur date d’expiration.",
        )}
        backHref="/careers"
        backLabel={t("Back to careers", "Retour aux carrières")}
      />

      <JobBoardList />
    </>
  );
}
