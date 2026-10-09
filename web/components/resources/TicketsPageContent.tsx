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

function statusTone(status: string) {
  if (status === "closed") return "bg-caisbe-muted/10 text-caisbe-muted";
  if (status === "waiting_student") return "bg-caisbe-text-dark/5 text-caisbe-text-dark";
  return "bg-caisbe-red/10 text-caisbe-red-dark";
}

function statusLabel(ticket: TicketRow) {
  const label = STATUS_LABELS[ticket.status] ?? ticket.status;
  return ticket.unread_count ? `${label} · ${ticket.unread_count} new` : label;
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
  const hasTickets = Boolean(tickets && tickets.length > 0);
  const lead = !signedIn
    ? ticketsContent.lead
    : tickets && tickets.length === 0 && !error
      ? ticketsContent.emptyLead
      : ticketsContent.signedInLead;

  return (
    <>
      <PageHero
        eyebrow={ticketsContent.eyebrow}
        title={ticketsContent.title}
        lead={lead}
        actions={
          loading ? null : signedIn ? (
            <ButtonLink href={ticketsPortalComposeUrl()} variant="primary">
              {ticketsContent.submitCtaLabel}
            </ButtonLink>
          ) : (
            <ButtonLink href={ticketsPortalLoginUrl()} variant="primary">
              {ticketsContent.loginCtaLabel}
            </ButtonLink>
          )
        }
      />

      {signedIn && (error || hasTickets || tickets === null) ? (
        <ContentSection className="!py-12 md:!py-16">
          {error ? (
            <p className="max-w-2xl leading-7 text-caisbe-red">{error}</p>
          ) : tickets === null ? (
            <p className="max-w-2xl leading-7 text-caisbe-muted">Loading tickets…</p>
          ) : (
            <div className="overflow-hidden rounded-[20px] bg-white shadow-hopewell">
              <ul className="divide-y divide-ifma-border-light md:hidden">
                {tickets?.map((ticket) => (
                  <li key={ticket.id}>
                    <a
                      href={portalUrl(`/messages?thread=${ticket.id}`)}
                      className="block px-5 py-4 hover:bg-[#f8fafc]"
                    >
                      <p className="break-words font-semibold text-caisbe-text-dark">{ticket.subject}</p>
                      <p className="mt-0.5 text-xs text-caisbe-muted">{ticketNumber(ticket.id)}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(ticket.status)}`}
                        >
                          {statusLabel(ticket)}
                        </span>
                        <span className="text-xs text-caisbe-muted">
                          {formatSubmittedDate(ticket.created_at)}
                        </span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
              <table className="hidden w-full table-fixed text-left text-sm md:table">
                <thead>
                  <tr className="border-b border-ifma-border-light">
                    {ticketsContent.tableHeaders.map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className={`px-6 py-4 font-hopewell-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark ${header === "Ticket" ? "" : "w-44 whitespace-nowrap"}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets?.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-ifma-border-light">
                      <td className="px-6 py-4">
                        <a
                          href={portalUrl(`/messages?thread=${ticket.id}`)}
                          className="break-words font-semibold text-caisbe-text-dark hover:text-caisbe-red"
                        >
                          {ticket.subject}
                        </a>
                        <p className="mt-0.5 text-xs text-caisbe-muted">{ticketNumber(ticket.id)}</p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(ticket.status)}`}
                        >
                          {statusLabel(ticket)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-caisbe-muted">
                        {formatSubmittedDate(ticket.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentSection>
      ) : null}
    </>
  );
}
