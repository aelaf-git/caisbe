"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ButtonLink from "@/components/ui/ButtonLink";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import { POSITION_OPTIONS, type AttendancePreference } from "@/lib/seminarRegistration";

type PositionOption = (typeof POSITION_OPTIONS)[number];

type ManagePayload = {
  registration_id: number;
  seminar_id: number;
  status: string;
  ticket_reference: string;
  seminar_title: string;
  event_date_label: string | null;
  event_time_label: string | null;
  where_label: string | null;
  online_join_url: string | null;
  can_edit: boolean;
  can_cancel: boolean;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string;
  phone: string;
  job_title: string;
  company: string;
  city: string;
  state_province: string;
  country: string;
  position: string;
  position_other: string | null;
  membership_status: string;
  earning_ceu: boolean;
  designations: string | null;
  attendance: AttendancePreference;
  accommodations: string | null;
  amount_cents: number;
  currency: string;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-ifma-border bg-white px-3 py-2.5 text-sm text-caisbe-text outline-none focus:border-caisbe-red focus:ring-4 focus:ring-caisbe-red/10";

export default function SeminarManageClient({ seminarId }: { seminarId: number }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [data, setData] = useState<ManagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [country, setCountry] = useState("");
  const [position, setPosition] = useState<PositionOption>(POSITION_OPTIONS[0]);
  const [positionOther, setPositionOther] = useState("");
  const [earningCeu, setEarningCeu] = useState(false);
  const [designations, setDesignations] = useState("");
  const [attendance, setAttendance] = useState<AttendancePreference>("in_person");
  const [accommodations, setAccommodations] = useState("");

  const applyData = useCallback((payload: ManagePayload) => {
    setData(payload);
    setFirstName(payload.first_name);
    setLastName(payload.last_name);
    setPreferredName(payload.preferred_name || "");
    setPhone(payload.phone);
    setJobTitle(payload.job_title);
    setCompany(payload.company);
    setCity(payload.city);
    setStateProvince(payload.state_province);
    setCountry(payload.country);
    const nextPosition = payload.position as PositionOption;
    setPosition(POSITION_OPTIONS.includes(nextPosition) ? nextPosition : POSITION_OPTIONS[0]);
    setPositionOther(payload.position_other || "");
    setEarningCeu(payload.earning_ceu);
    setDesignations(payload.designations || "");
    setAttendance(payload.attendance === "virtual" ? "virtual" : "in_person");
    setAccommodations(payload.accommodations || "");
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      setError("Missing management token. Use the link from your confirmation email.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/seminars/registrations/manage?token=${encodeURIComponent(token)}&seminar_id=${seminarId}`,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.detail === "string" ? body.detail : "Unable to load registration.");
      }
      applyData(body as ManagePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load registration.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [applyData, seminarId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!token || !data?.can_edit) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/seminars/registrations/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          preferred_name: preferredName.trim() || null,
          phone: phone.trim(),
          job_title: jobTitle.trim(),
          company: company.trim(),
          city: city.trim(),
          state_province: stateProvince.trim(),
          country: country.trim(),
          position,
          position_other: position.startsWith("Other") ? positionOther.trim() : null,
          earning_ceu: earningCeu,
          designations: earningCeu ? designations.trim() || null : null,
          attendance,
          accommodations: accommodations.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.detail === "string" ? body.detail : "Unable to save changes.");
      }
      applyData(body as ManagePayload);
      setMessage("Your registration details were updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelRegistration() {
    if (!token || !data?.can_cancel) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/seminars/registrations/manage/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.detail === "string" ? body.detail : "Unable to cancel registration.");
      }
      applyData(body as ManagePayload);
      setConfirmCancel(false);
      setMessage("Your registration has been cancelled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel registration.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Seminars"
        title={data?.seminar_title || "Manage registration"}
        lead={
          data
            ? `Ticket ${data.ticket_reference} · ${data.status === "cancelled" ? "Cancelled" : "Confirmed"}`
            : "View or update your seminar booking."
        }
        backHref={`/professional-development/seminars/${seminarId}/register`}
        backLabel="Back to registration"
      />
      <ContentSection>
        {loading ? <p className="text-sm text-caisbe-muted">Loading your registration…</p> : null}
        {error ? (
          <p className="rounded-lg border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-4 rounded-lg border border-emerald-700/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}

        {data ? (
          <div className="space-y-8">
            <dl className="grid gap-4 rounded-lg border border-ifma-border bg-white p-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">When</dt>
                <dd className="mt-1 text-sm text-caisbe-text">
                  {data.event_date_label || "TBA"}
                  {data.event_time_label ? ` · ${data.event_time_label}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Where</dt>
                <dd className="mt-1 text-sm text-caisbe-text">{data.where_label || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Ticket</dt>
                <dd className="mt-1 text-sm font-semibold text-caisbe-text">{data.ticket_reference}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Email</dt>
                <dd className="mt-1 text-sm text-caisbe-text">{data.email}</dd>
              </div>
            </dl>

            {data.online_join_url && data.status === "paid" ? (
              <div className="rounded-lg border border-caisbe-red/20 bg-caisbe-red/5 p-5">
                <p className="text-sm font-semibold text-caisbe-text-dark">Online join link</p>
                <p className="mt-1 text-sm text-caisbe-muted">
                  Use this link when the countdown hits zero on the event day.
                </p>
                <a
                  href={data.online_join_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-caisbe-red hover:underline"
                >
                  {data.online_join_url}
                </a>
              </div>
            ) : null}

            {data.can_edit ? (
              <form onSubmit={(event) => void save(event)} className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Update details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-semibold text-caisbe-text">First name</span>
                    <input className={fieldClass} required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-caisbe-text">Last name</span>
                    <input className={fieldClass} required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-semibold text-caisbe-text">Preferred name</span>
                    <input className={fieldClass} value={preferredName} onChange={(e) => setPreferredName(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-caisbe-text">Phone</span>
                    <input className={fieldClass} required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-caisbe-text">Job title</span>
                    <input className={fieldClass} required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-caisbe-text">Company</span>
                    <input className={fieldClass} required value={company} onChange={(e) => setCompany(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-caisbe-text">City</span>
                    <input className={fieldClass} required value={city} onChange={(e) => setCity(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-caisbe-text">State / province</span>
                    <input
                      className={fieldClass}
                      required
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-caisbe-text">Country</span>
                    <input className={fieldClass} required value={country} onChange={(e) => setCountry(e.target.value)} />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-semibold text-caisbe-text">Position</span>
                    <select className={fieldClass} value={position} onChange={(e) => setPosition(e.target.value as typeof position)}>
                      {POSITION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  {position.startsWith("Other") ? (
                    <label className="block text-sm sm:col-span-2">
                      <span className="font-semibold text-caisbe-text">Please specify</span>
                      <input
                        className={fieldClass}
                        required
                        value={positionOther}
                        onChange={(e) => setPositionOther(e.target.value)}
                      />
                    </label>
                  ) : null}
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-caisbe-text">Attendance</legend>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="attendance"
                      checked={attendance === "in_person"}
                      onChange={() => setAttendance("in_person")}
                    />
                    In person
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="attendance"
                      checked={attendance === "virtual"}
                      onChange={() => setAttendance("virtual")}
                    />
                    Virtual / online
                  </label>
                </fieldset>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={earningCeu} onChange={(e) => setEarningCeu(e.target.checked)} />
                  Earning CEU / continuing education credit
                </label>
                {earningCeu ? (
                  <label className="block text-sm">
                    <span className="font-semibold text-caisbe-text">Designations</span>
                    <input className={fieldClass} value={designations} onChange={(e) => setDesignations(e.target.value)} />
                  </label>
                ) : null}

                <label className="block text-sm">
                  <span className="font-semibold text-caisbe-text">Accommodations</span>
                  <textarea
                    className={`${fieldClass} min-h-24`}
                    value={accommodations}
                    onChange={(e) => setAccommodations(e.target.value)}
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex rounded-none border-2 border-caisbe-red bg-caisbe-red px-5 py-2.5 text-sm font-bold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </form>
            ) : data.status === "cancelled" ? (
              <p className="text-sm text-caisbe-muted">This registration is cancelled and can no longer be edited.</p>
            ) : (
              <p className="text-sm text-caisbe-muted">
                Edits are closed because the seminar has started. Contact support if you need help.
              </p>
            )}

            {data.can_cancel ? (
              <div className="border-t border-ifma-border-light pt-6">
                {!confirmCancel ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmCancel(true)}
                    className="text-sm font-semibold text-caisbe-red hover:underline disabled:opacity-60"
                  >
                    Cancel this registration
                  </button>
                ) : (
                  <div className="rounded-lg border border-caisbe-red/30 bg-caisbe-red/5 p-4">
                    <p className="text-sm text-caisbe-text">
                      Cancel ticket {data.ticket_reference}? This cannot be undone from this page.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void cancelRegistration()}
                        className="rounded-none border-2 border-caisbe-red bg-caisbe-red px-4 py-2 text-sm font-bold uppercase text-white disabled:opacity-60"
                      >
                        {busy ? "Cancelling…" : "Confirm cancel"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmCancel(false)}
                        className="rounded-none border-2 border-ifma-border px-4 py-2 text-sm font-semibold text-caisbe-text"
                      >
                        Keep registration
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contact" variant="secondary">
                Contact support
              </ButtonLink>
              <ButtonLink href="/professional-development" variant="primary">
                Professional development
              </ButtonLink>
            </div>
          </div>
        ) : null}
      </ContentSection>
    </>
  );
}
