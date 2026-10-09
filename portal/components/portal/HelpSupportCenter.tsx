"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Card from "@/components/ui/Card";
import { apiFetch, ApiError, type Enrollment } from "@/lib/auth";
import {
  ACCOUNT_REQUESTS,
  CERTIFICATION_REQUESTS,
  COURSE_REQUESTS,
  HELP_SECTIONS,
  TECHNICAL_GROUPS,
  ticketBody,
  ticketNumber,
  ticketSubject,
} from "@/lib/helpSupport";
import { siteUrl } from "@/lib/membershipApplication";
import type { SupportKind, SupportThread } from "@/lib/support";

const fieldClass =
  "mt-1 w-full rounded-md border border-ifma-border bg-admin-canvas px-3 py-2 text-sm text-caisbe-text";

type Notice = { ticketId: number } | { error: string };

function NoticeLine({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  if ("error" in notice) return <p className="mt-3 text-sm text-caisbe-red">{notice.error}</p>;
  return (
    <p className="mt-3 text-sm text-caisbe-text">
      Ticket {ticketNumber(notice.ticketId)} is open.{" "}
      <Link href={`/messages?thread=${notice.ticketId}`} className="font-semibold text-caisbe-red hover:underline">
        View ticket
      </Link>
    </p>
  );
}

export function HelpSupportCard() {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Help and Support</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-caisbe-muted">
            FAQs, technical problems, course and certificate questions, account help, and a way to
            report a problem.
          </p>
        </div>
        <Link href="/support" className="text-sm font-semibold text-caisbe-red hover:underline">
          Open Help and Support
        </Link>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {HELP_SECTIONS.map((section) => (
          <li key={section.id}>
            <Link
              href={`/support#${section.id}`}
              className="inline-flex rounded-full border border-ifma-border px-3 py-1.5 text-sm font-semibold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function HelpSupportCenter() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<string[]>([]);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, Notice>>({});

  const [problem, setProblem] = useState("");
  const [technicalDetails, setTechnicalDetails] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseRequest, setCourseRequest] = useState<string>(COURSE_REQUESTS[0]);
  const [courseDetails, setCourseDetails] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [certificateRequest, setCertificateRequest] = useState<string>(CERTIFICATION_REQUESTS[0]);
  const [certificateDetails, setCertificateDetails] = useState("");
  const [accountRequest, setAccountRequest] = useState<string>(ACCOUNT_REQUESTS[0]);
  const [accountDetails, setAccountDetails] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [reportWhere, setReportWhere] = useState("");
  const [reportWhat, setReportWhat] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  useEffect(() => {
    let active = true;
    void apiFetch<Enrollment[]>("/me/enrollments")
      .then((rows) => {
        if (!active) return;
        const titles = rows.map((row) =>
          row.course.code ? `${row.course.code} — ${row.course.title}` : row.course.title,
        );
        setCourses(titles);
        if (titles[0]) setCourseName(titles[0]);
      })
      .catch(() => {
        if (active) setCourses([]);
      });
    void apiFetch<SupportThread[]>("/me/support/threads")
      .then((rows) => {
        if (active) setThreads(rows);
      })
      .catch(() => {
        if (active) setThreads([]);
      });
    return () => {
      active = false;
    };
  }, []);

  async function sendTicket(
    sectionId: string,
    area: string,
    kind: SupportKind,
    topic: string,
    rows: { label: string; value: string }[],
  ) {
    setBusy(sectionId);
    try {
      const created = await apiFetch<SupportThread>("/me/support/threads", {
        method: "POST",
        body: JSON.stringify({
          subject: ticketSubject(area, topic),
          kind,
          body: ticketBody([{ label: "Request", value: topic }, ...rows]),
        }),
      });
      setNotices((current) => ({ ...current, [sectionId]: { ticketId: created.id } }));
      setThreads((current) => [created, ...current.filter((row) => row.id !== created.id)]);
      return true;
    } catch (err) {
      setNotices((current) => ({
        ...current,
        [sectionId]: { error: err instanceof ApiError ? err.detail : "Unable to submit this request." },
      }));
      return false;
    } finally {
      setBusy(null);
    }
  }

  function onTechnical(event: FormEvent) {
    event.preventDefault();
    void sendTicket("technical", "Technical Support", "issue", problem, [
      { label: "Details", value: technicalDetails },
    ]).then((ok) => {
      if (ok) setTechnicalDetails("");
    });
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2" aria-label="Help and Support sections">
        {HELP_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="inline-flex rounded-full border border-ifma-border bg-admin-surface px-3 py-1.5 text-sm font-semibold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <section id="faqs" className="scroll-mt-24 rounded-[20px] border border-ifma-border bg-admin-surface p-6 shadow-hopewell">
        <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">FAQs</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-caisbe-muted">
          Common questions and answers are already published on the CAISBE Help Desk.
        </p>
        <a
          href={siteUrl("/resources/help-desk")}
          className="mt-5 inline-flex h-11 items-center rounded-full bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark"
        >
          Open FAQs
        </a>
      </section>

      <section id="technical" className="scroll-mt-24 rounded-[20px] border border-ifma-border bg-admin-surface p-6 shadow-hopewell">
        <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Technical Support</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-caisbe-muted">
          Choose the problem you are seeing, describe what happened, and submit a ticket.
        </p>
        <form onSubmit={onTechnical} className="mt-5 max-w-2xl space-y-4">
          <label className="block text-sm font-semibold text-caisbe-text">
            Common technical problems
            <select
              required
              value={problem}
              onChange={(event) => setProblem(event.target.value)}
              className={fieldClass}
            >
              <option value="">Select a problem</option>
              {TECHNICAL_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={`${group.label}-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-caisbe-text">
            Details
            <textarea
              required
              rows={5}
              value={technicalDetails}
              onChange={(event) => setTechnicalDetails(event.target.value)}
              className={fieldClass}
              placeholder="What were you trying to do, and what happened?"
            />
          </label>
          <button
            type="submit"
            disabled={busy === "technical"}
            className="inline-flex h-11 items-center rounded-full bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            {busy === "technical" ? "Submitting…" : "Submit a ticket"}
          </button>
          <NoticeLine notice={notices.technical ?? null} />
        </form>
      </section>

      <RequestTable
        id="course"
        title="Course Support"
        description="Ask for help with a course you are taking."
        busy={busy === "course"}
        notice={notices.course ?? null}
        onSubmit={(event) => {
          event.preventDefault();
          void sendTicket("course", "Course Support", "question", courseRequest, [
            { label: "Course", value: courseName },
            { label: "Details", value: courseDetails },
          ]);
        }}
        rows={[
          {
            label: "Course",
            control:
              courses.length > 0 ? (
                <select
                  required
                  value={courseName}
                  onChange={(event) => setCourseName(event.target.value)}
                  className={fieldClass}
                >
                  {courses.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                  <option value="Other course">Other course</option>
                </select>
              ) : (
                <input
                  required
                  value={courseName}
                  onChange={(event) => setCourseName(event.target.value)}
                  className={fieldClass}
                  placeholder="Course name"
                />
              ),
          },
          {
            label: "Request",
            control: (
              <select
                required
                value={courseRequest}
                onChange={(event) => setCourseRequest(event.target.value)}
                className={fieldClass}
              >
                {COURSE_REQUESTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ),
          },
          {
            label: "Details",
            control: (
              <textarea
                required
                rows={4}
                value={courseDetails}
                onChange={(event) => setCourseDetails(event.target.value)}
                className={fieldClass}
              />
            ),
          },
        ]}
      />

      <RequestTable
        id="certification"
        title="Certification Support"
        description="Ask about a course certificate or your membership certificate."
        busy={busy === "certification"}
        notice={notices.certification ?? null}
        onSubmit={(event) => {
          event.preventDefault();
          void sendTicket(
            "certification",
            "Certification Support",
            "question",
            certificateRequest,
            [
              { label: "Certificate or program", value: certificateName },
              { label: "Details", value: certificateDetails },
            ],
          );
        }}
        rows={[
          {
            label: "Certificate or program",
            control: (
              <input
                required
                value={certificateName}
                onChange={(event) => setCertificateName(event.target.value)}
                className={fieldClass}
                placeholder="Program or certificate name"
              />
            ),
          },
          {
            label: "Request",
            control: (
              <select
                required
                value={certificateRequest}
                onChange={(event) => setCertificateRequest(event.target.value)}
                className={fieldClass}
              >
                {CERTIFICATION_REQUESTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ),
          },
          {
            label: "Details",
            control: (
              <textarea
                required
                rows={4}
                value={certificateDetails}
                onChange={(event) => setCertificateDetails(event.target.value)}
                className={fieldClass}
              />
            ),
          },
        ]}
      />

      <RequestTable
        id="account"
        title="Account Support"
        description="Ask for help with your myCAISBE account, membership, or registration."
        busy={busy === "account"}
        notice={notices.account ?? null}
        onSubmit={(event) => {
          event.preventDefault();
          void sendTicket("account", "Account Support", "question", accountRequest, [
            { label: "Account email", value: user?.email ?? "" },
            { label: "Details", value: accountDetails },
          ]);
        }}
        rows={[
          {
            label: "Account email",
            control: <p className="text-sm font-medium text-caisbe-text">{user?.email}</p>,
          },
          {
            label: "Request",
            control: (
              <select
                required
                value={accountRequest}
                onChange={(event) => setAccountRequest(event.target.value)}
                className={fieldClass}
              >
                {ACCOUNT_REQUESTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ),
          },
          {
            label: "Details",
            control: (
              <textarea
                required
                rows={4}
                value={accountDetails}
                onChange={(event) => setAccountDetails(event.target.value)}
                className={fieldClass}
              />
            ),
          },
        ]}
      />

      <RequestTable
        id="contact"
        title="Contact CAISBE"
        description="Send a message to CAISBE. It is delivered as a support ticket."
        busy={busy === "contact"}
        notice={notices.contact ?? null}
        submitLabel="Send message"
        onSubmit={(event) => {
          event.preventDefault();
          void sendTicket("contact", "Contact CAISBE", "general", contactSubject, [
            { label: "Message", value: contactMessage },
          ]);
        }}
        rows={[
          {
            label: "Subject",
            control: (
              <input
                required
                minLength={2}
                value={contactSubject}
                onChange={(event) => setContactSubject(event.target.value)}
                className={fieldClass}
              />
            ),
          },
          {
            label: "Message",
            control: (
              <textarea
                required
                rows={4}
                value={contactMessage}
                onChange={(event) => setContactMessage(event.target.value)}
                className={fieldClass}
              />
            ),
          },
        ]}
      />

      <RequestTable
        id="report"
        title="Report a Problem"
        description="Tell CAISBE about something that is not working."
        busy={busy === "report"}
        notice={notices.report ?? null}
        submitLabel="Submit report"
        onSubmit={(event) => {
          event.preventDefault();
          void sendTicket("report", "Report a Problem", "issue", reportWhat, [
            { label: "Where it happened", value: reportWhere },
            { label: "Details", value: reportDetails },
          ]);
        }}
        rows={[
          {
            label: "Where it happened",
            control: (
              <input
                required
                value={reportWhere}
                onChange={(event) => setReportWhere(event.target.value)}
                className={fieldClass}
                placeholder="Page, course, or exam"
              />
            ),
          },
          {
            label: "What went wrong",
            control: (
              <input
                required
                minLength={2}
                value={reportWhat}
                onChange={(event) => setReportWhat(event.target.value)}
                className={fieldClass}
              />
            ),
          },
          {
            label: "Details",
            control: (
              <textarea
                required
                rows={4}
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                className={fieldClass}
              />
            ),
          },
        ]}
      />

      <section className="overflow-hidden rounded-[20px] border border-ifma-border bg-admin-surface shadow-hopewell">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Your requests</h2>
          <p className="mt-1 text-sm text-caisbe-muted">Tickets you have already sent to CAISBE.</p>
        </div>
        {threads.length === 0 ? (
          <p className="px-5 py-8 text-caisbe-muted">No requests yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-ifma-border-light md:hidden">
              {threads.map((thread) => (
                <li key={thread.id} className="px-5 py-4">
                  <p className="break-words font-medium text-caisbe-text">{thread.subject}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="capitalize text-caisbe-muted">{thread.status.replaceAll("_", " ")}</span>
                    <Link href={`/messages?thread=${thread.id}`} className="font-semibold text-caisbe-red hover:underline">
                      {ticketNumber(thread.id)}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-ifma-border-light bg-admin-surface-muted/40">
                    {["Request", "Status", "Number"].map((header) => (
                      <th
                        key={header}
                        className={`px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark ${header === "Request" ? "" : "w-40 whitespace-nowrap"}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ifma-border-light">
                  {threads.map((thread) => (
                    <tr key={thread.id}>
                      <td className="break-words px-5 py-4 font-medium text-caisbe-text">{thread.subject}</td>
                      <td className="whitespace-nowrap px-5 py-4 capitalize text-caisbe-muted">
                        {thread.status.replaceAll("_", " ")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <Link href={`/messages?thread=${thread.id}`} className="font-semibold text-caisbe-red hover:underline">
                          {ticketNumber(thread.id)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function RequestTable({
  id,
  title,
  description,
  rows,
  busy,
  notice,
  onSubmit,
  submitLabel = "Submit request",
}: {
  id: string;
  title: string;
  description: string;
  rows: { label: string; control: ReactNode }[];
  busy: boolean;
  notice: Notice | null;
  onSubmit: (event: FormEvent) => void;
  submitLabel?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 overflow-hidden rounded-[20px] border border-ifma-border bg-admin-surface shadow-hopewell">
      <div className="border-b border-ifma-border-light px-6 py-4">
        <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-caisbe-muted">{description}</p>
      </div>
      <form onSubmit={onSubmit}>
        <table className="block w-full text-left text-sm md:table">
          <thead className="hidden md:table-header-group">
            <tr className="border-b border-ifma-border-light bg-admin-surface-muted/40">
              <th className="w-48 px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark">
                Field
              </th>
              <th className="px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark">
                Your request
              </th>
            </tr>
          </thead>
          <tbody className="block divide-y divide-ifma-border-light md:table-row-group md:divide-y-0">
            {rows.map((row) => (
              <tr key={row.label} className="block border-b border-ifma-border-light px-5 py-4 last:border-b-0 md:table-row md:px-0">
                <th
                  scope="row"
                  className="block pb-2 text-left font-semibold text-caisbe-text md:table-cell md:w-48 md:px-5 md:py-4 md:align-top"
                >
                  {row.label}
                </th>
                <td className="block min-w-0 md:table-cell md:px-5 md:py-4">{row.control}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center rounded-full bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            {busy ? "Submitting…" : submitLabel}
          </button>
          <NoticeLine notice={notice} />
        </div>
      </form>
    </section>
  );
}
