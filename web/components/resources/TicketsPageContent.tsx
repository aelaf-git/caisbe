"use client";

import { useEffect, useState } from "react";
import { useStudentSession } from "@/components/auth/useStudentSession";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import ButtonLink from "@/components/ui/ButtonLink";
import { portalUrl } from "@/lib/api";
import { ticketsContent, ticketsPortalComposeUrl, ticketsPortalLoginUrl } from "@/lib/data/tickets";
import { ticketNumber } from "@/lib/helpSupport";
import { studentFetch, StudentApiError } from "@/lib/studentSession";

type TicketRow = {
  id: number;
  subject: string;
  kind: string;
  status: string;
  created_at: string;
  unread_count?: number;
};

const KIND_LABELS: Record<string, string> = {
  question: "Question",
  issue: "Issue",
  general: "General",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  waiting_admin: "Awaiting admin",
  waiting_student: "Awaiting you",
  closed: "Closed",
};

function formatSubmittedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TicketsPageContent() {
  const { user, loading } = useStudentSession();
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    void studentFetch<TicketRow[]>("/me/support/threads")
      .then((rows) => {
        if (active) setTickets(rows);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof StudentApiError ? err.detail : "Unable to load tickets.");
        setTickets([]);
      });
    return () => {
      active = false;
    };
  }, [loading, user]);

  const signedIn = Boolean(user);
  const submitHref = signedIn ? ticketsPortalComposeUrl() : ticketsPortalLoginUrl("/messages?compose=1");

  return (
    <>
      <PageHero
        eyebrow={ticketsContent.eyebrow}
        title={ticketsContent.title}
        lead={
          signedIn
            ? "Track the status of your support tickets."
            : loading
              ? "Loading your tickets…"
              : ticketsContent.lead
        }
        actions={
          signedIn ? (
            <ButtonLink href={portalUrl("/messages")} variant="primary">
              Open in myCAISBE
            </ButtonLink>
          ) : loading ? null : (
            <ButtonLink href={ticketsPortalLoginUrl()} variant="primary">
              {ticketsContent.loginCtaLabel}
            </ButtonLink>
          )
        }
      />

      <ContentSection className="!py-12 md:!py-16">
        <div className="overflow-x-auto rounded-[20px] bg-white shadow-hopewell">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ifma-border-light">
                {ticketsContent.tableHeaders.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-5 py-4 font-hopewell-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark md:px-6"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signedIn && tickets && tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-ifma-border-light">
                    <td className="px-5 py-4 md:px-6">
                      <a
                        href={portalUrl(`/messages?thread=${ticket.id}`)}
                        className="font-semibold text-caisbe-text-dark hover:text-caisbe-red"
                      >
                        {ticket.subject}
                      </a>
                      <p className="mt-0.5 text-xs text-caisbe-muted">
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                        {ticket.unread_count ? ` · ${ticket.unread_count} new` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-caisbe-text md:px-6">
                      {KIND_LABELS[ticket.kind] ?? ticket.kind}
                    </td>
                    <td className="px-5 py-4 text-caisbe-muted md:px-6">
                      {formatSubmittedDate(ticket.created_at)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-caisbe-text-dark md:px-6">
                      <a
                        href={portalUrl(`/messages?thread=${ticket.id}`)}
                        className="hover:text-caisbe-red"
                      >
                        {ticketNumber(ticket.id)}
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={ticketsContent.tableHeaders.length}
                    className="px-5 py-10 text-caisbe-muted md:px-6 md:text-base"
                  >
                    {error ? (
                      <p className="max-w-2xl leading-7 text-caisbe-red">{error}</p>
                    ) : signedIn && tickets && tickets.length === 0 ? (
                      <p className="max-w-2xl leading-7">
                        No tickets yet. Submit a support ticket to report an issue or ask a question.
                      </p>
                    ) : signedIn || loading ? (
                      <p className="max-w-2xl leading-7">Loading tickets…</p>
                    ) : (
                      <>
                        <p className="max-w-2xl leading-7">{ticketsContent.tableEmpty}</p>
                        <div className="mt-6">
                          <ButtonLink href={ticketsPortalLoginUrl()} variant="secondary">
                            {ticketsContent.loginCtaLabel}
                          </ButtonLink>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ContentSection>

      <ContentSection
        title={ticketsContent.submitTitle}
        description={ticketsContent.submitBody}
        className="!py-12 md:!py-16 bg-[#fafafa]"
      >
        <ButtonLink href={submitHref} variant="primary">
          {ticketsContent.submitCtaLabel}
        </ButtonLink>
      </ContentSection>
    </>
  );
}
