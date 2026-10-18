"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ButtonLink from "@/components/ui/ButtonLink";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";

export default function SeminarRegistrationSuccessPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const registrationId = searchParams.get("registration_id");
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "paid" | "error">("loading");
  const [message, setMessage] = useState("Confirming your registration…");

  useEffect(() => {
    let cancelled = false;
    async function confirm() {
      if (!registrationId) {
        setStatus("error");
        setMessage("Missing registration reference.");
        return;
      }
      if (!sessionId) {
        // Dev / zero-fee path without Stripe
        if (!cancelled) {
          setStatus("paid");
          setMessage(
            "Your registration was received. A confirmation email will follow within one business day.",
          );
        }
        return;
      }
      try {
        const res = await fetch(
          `/api/seminars/registrations/confirm?registration_id=${encodeURIComponent(registrationId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.detail === "string" ? data.detail : "Unable to confirm payment.",
          );
        }
        if (!cancelled) {
          setStatus("paid");
          setMessage(
            "Payment confirmed. Confirmation and access instructions will be sent by email within one business day.",
          );
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Unable to confirm payment.");
        }
      }
    }
    void confirm();
    return () => {
      cancelled = true;
    };
  }, [registrationId, sessionId]);

  return (
    <>
      <PageHero
        eyebrow="Seminars"
        title={status === "paid" ? "Registration complete" : "Registration status"}
        lead={message}
        backHref={`/professional-development/seminars/${params.id}/register`}
        backLabel="Back to registration"
      />
      <ContentSection>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/professional-development" variant="primary">
            Professional development
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact us
          </ButtonLink>
        </div>
        {status === "loading" ? (
          <p className="mt-6 text-sm text-caisbe-muted">Please wait…</p>
        ) : null}
      </ContentSection>
    </>
  );
}
