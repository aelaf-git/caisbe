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
  const manageToken = searchParams.get("manage_token");
  const [status, setStatus] = useState<"loading" | "paid" | "error">("loading");
  const [message, setMessage] = useState("Confirming your registration…");
  const [manageUrl, setManageUrl] = useState<string | null>(
    manageToken
      ? `/professional-development/seminars/${params.id}/manage?token=${encodeURIComponent(manageToken)}`
      : null,
  );

  useEffect(() => {
    let cancelled = false;
    async function confirm() {
      if (!registrationId) {
        setStatus("error");
        setMessage("Missing registration reference.");
        return;
      }
      if (!sessionId) {
        if (!cancelled) {
          setStatus("paid");
          setMessage(
            "Your registration is confirmed. A confirmation email with your ticket details and management link has been sent.",
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
            "Payment confirmed. Your booking confirmation email has been sent with ticket details and a link to manage your registration.",
          );
          if (typeof data.manage_url === "string" && data.manage_url) {
            try {
              const parsed = new URL(data.manage_url);
              setManageUrl(`${parsed.pathname}${parsed.search}`);
            } catch {
              setManageUrl(data.manage_url);
            }
          }
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
        title={status === "paid" ? "Registration confirmed" : "Registration status"}
        lead={message}
        backHref={`/professional-development/seminars/${params.id}/register`}
        backLabel="Back to registration"
      />
      <ContentSection>
        <div className="flex flex-wrap gap-3">
          {status === "paid" && manageUrl ? (
            <ButtonLink href={manageUrl} variant="primary">
              Manage registration
            </ButtonLink>
          ) : null}
          <ButtonLink href="/professional-development" variant={manageUrl ? "secondary" : "primary"}>
            Professional development
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact us
          </ButtonLink>
        </div>
        {status === "loading" ? (
          <p className="mt-6 text-sm text-caisbe-muted">Please wait…</p>
        ) : null}
        {status === "paid" && registrationId ? (
          <p className="mt-6 text-sm text-caisbe-muted">Ticket reference #{registrationId}</p>
        ) : null}
      </ContentSection>
    </>
  );
}
