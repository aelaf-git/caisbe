import type { Metadata } from "next";
import HelpSupportPage from "@/components/support/HelpSupportPage";
import { cmsTopicMetadata } from "@/lib/cmsTopic";
import { fetchPublishedSitePage } from "@/lib/sitePages";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  const fallbackDescription = t(
    "FAQs, technical support tickets, and requests for courses, certificates, your account, and problems to report.",
    "FAQ, billets de soutien technique et demandes concernant les cours, les certificats, votre compte et les problèmes à signaler.",
  );
  return (
    (await cmsTopicMetadata("/help", fallbackDescription)) ?? {
      title: t("Help and Support | CAISBE", "Aide et soutien | CAISBE"),
      description: fallbackDescription,
    }
  );
}

export default async function HelpPage() {
  const page = await fetchPublishedSitePage("/help");
  return <HelpSupportPage title={page?.title} lead={page?.lead} />;
}
