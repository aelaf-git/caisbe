"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function PrintableFormToolbar({ kind }: { kind: "application" | "renewal" }) {
  const t = useT();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href="/membership/join" className="text-sm font-semibold text-caisbe-red">
        {t("Back to membership", "Retour à l’adhésion")}
      </Link>
      <div className="flex flex-wrap gap-3">
        {kind === "application" ? (
          <>
            <a
              href="/forms/caisbe-membership-registration.pdf"
              download="CAISBE-Membership-Registration.pdf"
              className="rounded-full bg-caisbe-red px-4 py-2 text-sm font-semibold text-white"
            >
              {t("Download PDF form", "Télécharger le formulaire PDF")}
            </a>
            <a
              href="/forms/caisbe-membership-registration.docx"
              download="CAISBE-Membership-Registration.docx"
              className="rounded-full border-2 border-caisbe-red bg-white px-4 py-2 text-sm font-semibold text-caisbe-red"
            >
              {t("Download Word form", "Télécharger le formulaire Word")}
            </a>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => window.print()}
          className={
            kind === "application"
              ? "rounded-full border-2 border-caisbe-red bg-white px-4 py-2 text-sm font-semibold text-caisbe-red"
              : "rounded-full bg-caisbe-red px-4 py-2 text-sm font-semibold text-white"
          }
        >
          {t("Print / Save PDF", "Imprimer / Enregistrer en PDF")}
        </button>
      </div>
    </div>
  );
}
