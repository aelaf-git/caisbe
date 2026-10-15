"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { unsubscribeNewsletter } from "@/lib/api";
import { useT } from "@/lib/i18n/LocaleProvider";

type Status = "loading" | "success" | "error";

export default function UnsubscribeClient() {
  const t = useT();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            t(
              "This unsubscribe link is missing or incomplete.",
              "Ce lien de désabonnement est manquant ou incomplet.",
            ),
          );
        }
        return;
      }
      try {
        const result = await unsubscribeNewsletter({ token });
        if (!cancelled) {
          setStatus("success");
          setMessage(
            t(result.message, "Vous êtes désabonné de l’infolettre du CAISBE."),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            err instanceof Error
              ? err.message
              : t("Unable to unsubscribe. Try again later.", "Impossible de vous désabonner. Réessayez plus tard."),
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-caisbe-red">
        {t("CAISBE Newsletter", "Infolettre du CAISBE")}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ifma-navy">
        {status === "success"
          ? t("Unsubscribed", "Désabonnement confirmé")
          : status === "error"
            ? t("Unable to unsubscribe", "Impossible de se désabonner")
            : t("Unsubscribe", "Se désabonner")}
      </h1>
      <p
        className={`mt-4 text-base leading-relaxed ${
          status === "error" ? "text-caisbe-red" : "text-ifma-navy/80"
        }`}
        role={status === "error" ? "alert" : undefined}
      >
        {message ?? t("Processing your request…", "Traitement de votre demande…")}
      </p>
    </div>
  );
}
