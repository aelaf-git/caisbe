"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useStudentSession } from "@/components/auth/useStudentSession";
import { portalUrl } from "@/lib/api";
import { HELP_FR } from "@/lib/i18n/content/help.fr";
import { useLocale, useTranslate } from "@/lib/i18n/LocaleProvider";
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
import { StudentApiError, studentFetch, type StudentUser } from "@/lib/studentSession";

const fieldClass =
  "mt-1 w-full rounded-md border border-ifma-border bg-white px-3 py-2 text-sm text-caisbe-text";

type Notice = { ticketId: number } | { error: string };
type SupportKind = "question" | "issue" | "general";
type SupportThread = { id: number; subject: string; status: string };
type Enrollment = { course: { code: string; title: string } };

function loginToHelp() {
  const next = encodeURIComponent(`${window.location.origin}/help`);
  window.location.href = portalUrl(`/login?next=${next}`);
}

function NoticeLine({ notice }: { notice: Notice | null }) {
  const L = useTranslate(HELP_FR);
  const fr = useLocale() === "fr";
  if (!notice) return null;
  if ("error" in notice) return <p className="mt-3 text-sm text-caisbe-red">{notice.error}</p>;
  return (
    <p className="mt-3 text-sm text-caisbe-text">
      {fr ? "Le billet" : "Ticket"} {ticketNumber(notice.ticketId)} {fr ? "est ouvert." : "is open."}{" "}
      <a
        href={portalUrl(`/messages?thread=${notice.ticketId}`)}
        className="font-semibold text-caisbe-red hover:underline"
      >
        {L("View ticket in myCAISBE")}
      </a>
    </p>
  );
}

export default function HelpSupportPage({
  title: titleProp,
  lead: leadProp,
}: {
  title?: string;
  lead?: string;
}) {
  const L = useTranslate(HELP_FR);
  const fr = useLocale() === "fr";
  const title = titleProp ?? L("Help and Support");
  const lead =
    leadProp ??
    L("FAQs, technical tickets, and requests for courses, certificates, your account, and problems to report.");
  const { user, loading: sessionLoading } = useStudentSession();
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
    if (!user) return;
    let active = true;
    void studentFetch<Enrollment[]>("/me/enrollments")
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
    void studentFetch<SupportThread[]>("/me/support/threads")
      .then((rows) => {
        if (active) setThreads(rows);
      })
      .catch(() => {
        if (active) setThreads([]);
      });
    return () => {
      active = false;
    };
  }, [user]);

  async function sendTicket(
    sectionId: string,
    area: string,
    kind: SupportKind,
    topic: string,
    rows: { label: string; value: string }[],
  ) {
    if (!user) {
      loginToHelp();
      return false;
    }
    setBusy(sectionId);
    try {
      const created = await studentFetch<SupportThread>("/me/support/threads", {
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
        [sectionId]: {
          error: err instanceof StudentApiError
            ? err.detail
            : fr
              ? "Impossible de soumettre cette demande."
              : "Unable to submit this request.",
        },
      }));
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="bg-[#f8fafc] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <p className="inline-flex rounded-full bg-caisbe-red/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-caisbe-red-dark">
            {L("Support")}
          </p>
          <h1 className="font-hopewell-display mt-4 text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-caisbe-text sm:text-lg">
            {lead}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {sessionLoading ? null : user ? (
              <a
                href={portalUrl("/dashboard")}
                className="inline-flex h-11 items-center rounded-none bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark"
              >
                {L("Open myCAISBE")}
              </a>
            ) : (
              <button
                type="button"
                onClick={loginToHelp}
                className="inline-flex h-11 items-center rounded-none bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark"
              >
                {L("Log in to request support")}
              </button>
            )}
            <Link
              href="/resources/help-desk"
              className="inline-flex h-11 items-center rounded-none border border-ifma-border bg-white px-5 text-sm font-semibold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
            >
              {L("Open FAQs")}
            </Link>
          </div>
          {user ? (
            <p className="mt-4 text-sm text-caisbe-muted">{fr ? "Connecté en tant que" : "Signed in as"} {user.full_name}.</p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-12">
        <section id="faqs" className="scroll-mt-28 rounded-none bg-white p-6 shadow-hopewell">
          <h2 className="font-hopewell-display text-2xl font-extrabold text-caisbe-text-dark">FAQs</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-caisbe-muted">
            {L("Common questions and answers are already published on the CAISBE Help Desk.")}
          </p>
          <Link
            href="/resources/help-desk"
            className="mt-5 inline-flex h-11 items-center rounded-none bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark"
          >
            {L("Open FAQs")}
          </Link>
        </section>

        {sessionLoading ? (
          <p className="text-sm text-caisbe-muted">{fr ? "Vérification de votre connexion…" : "Checking your sign-in status…"}</p>
        ) : !user ? (
          <section
            id="request-support"
            className="scroll-mt-28 rounded-none bg-white p-6 shadow-hopewell"
          >
            <h2 className="font-hopewell-display text-2xl font-extrabold text-caisbe-text-dark">
              {L("Request support")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-caisbe-muted">
              {L(
                "Sign in to myCAISBE to open technical, course, certificate, account, and problem-report requests. Support forms and your ticket history are available after you log in.",
              )}
            </p>
            <button
              type="button"
              onClick={loginToHelp}
              className="mt-5 inline-flex h-11 items-center rounded-none bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark"
            >
              {L("Log in to request support")}
            </button>
          </section>
        ) : (
          <>
            <nav className="flex flex-wrap gap-2" aria-label={L("Help and Support sections")}>
              {HELP_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="inline-flex rounded-none border border-ifma-border bg-white px-3 py-1.5 text-sm font-semibold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
                >
                  {L(section.label)}
                </a>
              ))}
            </nav>

            <section id="technical" className="scroll-mt-28 rounded-none bg-white p-6 shadow-hopewell">
              <h2 className="font-hopewell-display text-2xl font-extrabold text-caisbe-text-dark">
                {L("Technical Support")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-caisbe-muted">
                {L("Choose the problem you are seeing, describe what happened, and submit a ticket.")}
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendTicket("technical", "Technical Support", "issue", problem, [
                    { label: "Details", value: technicalDetails },
                  ]).then((ok) => {
                    if (ok) setTechnicalDetails("");
                  });
                }}
                className="mt-5 max-w-2xl space-y-4"
              >
                <label className="block text-sm font-semibold text-caisbe-text">
                  {L("Common technical problems")}
                  <select
                    required
                    value={problem}
                    onChange={(event) => setProblem(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">{L("Select a problem")}</option>
                    {TECHNICAL_GROUPS.map((group) => (
                      <optgroup key={group.label} label={L(group.label)}>
                        {group.options.map((option) => (
                          <option key={`${group.label}-${option}`} value={option}>
                            {L(option)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-caisbe-text">
                  {L("Details")}
                  <textarea
                    required
                    rows={5}
                    value={technicalDetails}
                    onChange={(event) => setTechnicalDetails(event.target.value)}
                    className={fieldClass}
                    placeholder={L("What were you trying to do, and what happened?")}
                  />
                </label>
                <SubmitButton busy={busy === "technical"} signedIn label="Submit a ticket" />
                <NoticeLine notice={notices.technical ?? null} />
              </form>
            </section>

            <RequestTable
              id="course"
              title={L("Course Support")}
              description={L("Ask for help with a course you are taking.")}
              busy={busy === "course"}
              signedIn
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
                        {courses.map((courseTitle) => (
                          <option key={courseTitle} value={courseTitle}>
                            {courseTitle}
                          </option>
                        ))}
                        <option value="Other course">{L("Other course")}</option>
                      </select>
                    ) : (
                      <input
                        required
                        value={courseName}
                        onChange={(event) => setCourseName(event.target.value)}
                        className={fieldClass}
                        placeholder={L("Course name")}
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
                          {L(option)}
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
              title={L("Certification Support")}
              description={L("Ask about a course certificate or your membership certificate.")}
              busy={busy === "certification"}
              signedIn
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
                      placeholder={L("Program or certificate name")}
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
                          {L(option)}
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

            <AccountTable
              user={user}
              busy={busy === "account"}
              notice={notices.account ?? null}
              accountRequest={accountRequest}
              accountDetails={accountDetails}
              setAccountRequest={setAccountRequest}
              setAccountDetails={setAccountDetails}
              onSubmit={(event) => {
                event.preventDefault();
                void sendTicket("account", "Account Support", "question", accountRequest, [
                  { label: "Account email", value: user.email },
                  { label: "Details", value: accountDetails },
                ]);
              }}
            />

            <RequestTable
              id="contact"
              title={L("Contact CAISBE")}
              description={L("Send a message to CAISBE. It is delivered as a support ticket.")}
              busy={busy === "contact"}
              signedIn
              notice={notices.contact ?? null}
              submitLabel={L("Send message")}
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
              title={L("Report a Problem")}
              description={L("Tell CAISBE about something that is not working.")}
              busy={busy === "report"}
              signedIn
              notice={notices.report ?? null}
              submitLabel={L("Submit report")}
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
                      placeholder={L("Page, course, or exam")}
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

            <section className="overflow-hidden rounded-none bg-white shadow-hopewell">
              <div className="border-b border-ifma-border-light px-6 py-4">
                <h2 className="font-hopewell-display text-2xl font-extrabold text-caisbe-text-dark">
                  {L("Your requests")}
                </h2>
                <p className="mt-1 text-sm text-caisbe-muted">{fr ? "Les billets que vous avez déjà envoyés au CAISBE." : "Tickets you have already sent to CAISBE."}</p>
              </div>
              {threads.length === 0 ? (
                <p className="px-5 py-8 text-caisbe-muted">{fr ? "Aucune demande pour le moment." : "No requests yet."}</p>
              ) : (
                <>
                  <ul className="divide-y divide-ifma-border-light md:hidden">
                    {threads.map((thread) => (
                      <li key={thread.id} className="px-5 py-4">
                        <p className="break-words font-medium text-caisbe-text">{thread.subject}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="capitalize text-caisbe-muted">
                            {L(thread.status.replaceAll("_", " "))}
                          </span>
                          <a
                            href={portalUrl(`/messages?thread=${thread.id}`)}
                            className="font-semibold text-caisbe-red hover:underline"
                          >
                            {ticketNumber(thread.id)}
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden md:block">
                    <table className="w-full table-fixed text-left text-sm">
                      <thead>
                        <tr className="border-b border-ifma-border-light">
                          {["Request", "Status", "Number"].map((header) => (
                            <th
                              key={header}
                              className={`px-5 py-3 font-hopewell-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark ${header === "Request" ? "" : "w-40 whitespace-nowrap"}`}
                            >
                              {L(header)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {threads.map((thread) => (
                          <tr key={thread.id} className="border-t border-ifma-border-light">
                            <td className="break-words px-5 py-4 font-medium text-caisbe-text">
                              {thread.subject}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 capitalize text-caisbe-muted">
                              {L(thread.status.replaceAll("_", " "))}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4">
                              <a
                                href={portalUrl(`/messages?thread=${thread.id}`)}
                                className="font-semibold text-caisbe-red hover:underline"
                              >
                                {ticketNumber(thread.id)}
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

function SubmitButton({
  busy,
  signedIn,
  label,
}: {
  busy: boolean;
  signedIn: boolean;
  label: string;
}) {
  const L = useTranslate(HELP_FR);
  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={loginToHelp}
        className="inline-flex h-11 items-center rounded-none bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark"
      >
        {L("Log in to submit")}
      </button>
    );
  }
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex h-11 items-center rounded-none bg-caisbe-red px-5 text-sm font-bold text-white hover:bg-caisbe-red-dark disabled:opacity-60"
    >
      {busy ? L("Submitting…") : L(label)}
    </button>
  );
}

function RequestTable({
  id,
  title,
  description,
  rows,
  busy,
  signedIn,
  notice,
  onSubmit,
  submitLabel = "Submit request",
}: {
  id: string;
  title: string;
  description: string;
  rows: { label: string; control: ReactNode }[];
  busy: boolean;
  signedIn: boolean;
  notice: Notice | null;
  onSubmit: (event: FormEvent) => void;
  submitLabel?: string;
}) {
  const L = useTranslate(HELP_FR);
  return (
    <section id={id} className="scroll-mt-28 overflow-hidden rounded-none bg-white shadow-hopewell">
      <div className="border-b border-ifma-border-light px-6 py-4">
        <h2 className="font-hopewell-display text-2xl font-extrabold text-caisbe-text-dark">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-caisbe-muted">{description}</p>
      </div>
      <form onSubmit={onSubmit}>
        <table className="block w-full text-left text-sm md:table">
          <thead className="hidden md:table-header-group">
            <tr className="border-b border-ifma-border-light">
              <th className="w-56 px-5 py-3 font-hopewell-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark">
                {L("Field")}
              </th>
              <th className="px-5 py-3 font-hopewell-display text-xs font-bold uppercase tracking-wider text-caisbe-text-dark">
                {L("Your request")}
              </th>
            </tr>
          </thead>
          <tbody className="block divide-y divide-ifma-border-light md:table-row-group md:divide-y-0">
            {rows.map((row) => (
              <tr key={L(row.label)} className="block border-b border-ifma-border-light px-5 py-4 last:border-b-0 md:table-row md:px-0">
                <th
                  scope="row"
                  className="block pb-2 text-left font-semibold text-caisbe-text md:table-cell md:w-56 md:px-5 md:py-4 md:align-top"
                >
                  {L(row.label)}
                </th>
                <td className="block min-w-0 md:table-cell md:px-5 md:py-4">{row.control}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4">
          <SubmitButton busy={busy} signedIn={signedIn} label={submitLabel} />
          <NoticeLine notice={notice} />
        </div>
      </form>
    </section>
  );
}

function AccountTable({
  user,
  busy,
  notice,
  accountRequest,
  accountDetails,
  setAccountRequest,
  setAccountDetails,
  onSubmit,
}: {
  user: StudentUser | null;
  busy: boolean;
  notice: Notice | null;
  accountRequest: string;
  accountDetails: string;
  setAccountRequest: (value: string) => void;
  setAccountDetails: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const L = useTranslate(HELP_FR);
  return (
    <RequestTable
      id="account"
      title={L("Account Support")}
      description={L("Ask for help with your myCAISBE account, membership, or registration.")}
      busy={busy}
      signedIn={Boolean(user)}
      notice={notice}
      onSubmit={onSubmit}
      rows={[
        {
          label: "Account email",
          control: (
            <p className="text-sm font-medium text-caisbe-text">{user?.email ?? L("Shown after you sign in")}</p>
          ),
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
                  {L(option)}
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
  );
}
