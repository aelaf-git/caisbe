import type { Metadata } from "next";
import { Suspense } from "react";
import UnsubscribeClient from "./UnsubscribeClient";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("Unsubscribe | CAISBE", "Se désabonner | CAISBE"),
    description: t("Unsubscribe from the CAISBE newsletter.", "Désabonnez-vous de l’infolettre du CAISBE."),
  };
}

export default async function NewsletterUnsubscribePage() {
  const { t } = await getServerT();
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center px-6 py-16">
      <Suspense
        fallback={
          <p className="text-center text-base text-ifma-navy/70">
            {t("Processing your request…", "Traitement de votre demande…")}
          </p>
        }
      >
        <UnsubscribeClient />
      </Suspense>
    </main>
  );
}
