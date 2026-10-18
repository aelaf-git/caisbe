"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ButtonLink from "@/components/ui/ButtonLink";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import type { Seminar } from "@/lib/api";
import {
  POSITION_OPTIONS,
  formatUsd,
  type AttendancePreference,
  type MembershipStatus,
} from "@/lib/seminarRegistration";

type PositionOption = (typeof POSITION_OPTIONS)[number];

type Props = {
  seminar: Seminar;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-ifma-border bg-white px-3 py-2.5 text-sm text-caisbe-text outline-none focus:border-caisbe-red focus:ring-4 focus:ring-caisbe-red/10";

export default function SeminarRegistrationClient({ seminar }: Props) {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

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
  const [membershipStatus, setMembershipStatus] =
    useState<MembershipStatus>("association_member");
  const [memberId, setMemberId] = useState("");
  const [earningCeu, setEarningCeu] = useState<"yes" | "no">("no");
  const [designations, setDesignations] = useState("");
  const [attendance, setAttendance] = useState<AttendancePreference>("in_person");
  const [accommodations, setAccommodations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const memberCents = seminar.member_price_cents ?? 5000;
  const nonMemberCents = seminar.non_member_price_cents ?? 7500;
  const studentCents = seminar.student_price_cents ?? 4000;
  const registrationOpen = seminar.registration_enabled !== false;

  const selectedRate = useMemo(() => {
    if (membershipStatus === "association_member") return memberCents;
    if (membershipStatus === "student") return studentCents;
    return nonMemberCents;
  }, [membershipStatus, memberCents, nonMemberCents, studentCents]);

  useEffect(() => {
    if (!tokenFromUrl) return;
    let cancelled = false;
    async function verify() {
      setGateBusy(true);
      setGateError(null);
      try {
        const res = await fetch(`/api/seminars/${seminar.id}/access/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenFromUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.detail || "Invalid or expired access link.");
        }
        if (!cancelled) {
          setAccessToken(data.access_token || tokenFromUrl);
          setVerifiedEmail(data.email || "");
          setEmail(data.email || "");
          setGateMessage(data.message || "Email verified. Complete the form below.");
        }
      } catch (err) {
        if (!cancelled) {
          setGateError(err instanceof Error ? err.message : "Unable to verify access link.");
        }
      } finally {
        if (!cancelled) setGateBusy(false);
      }
    }
    void verify();
    return () => {
      cancelled = true;
    };
  }, [seminar.id, tokenFromUrl]);

  async function requestAccess(event: FormEvent) {
    event.preventDefault();
    setGateBusy(true);
    setGateError(null);
    setGateMessage(null);
    try {
      const res = await fetch(`/api/seminars/${seminar.id}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Unable to send access email.");
      }
      setGateMessage(
        data.message ||
          "Check your email for a link to continue seminar registration.",
      );
    } catch (err) {
      setGateError(err instanceof Error ? err.message : "Unable to send access email.");
    } finally {
      setGateBusy(false);
    }
  }

  async function submitRegistration(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !verifiedEmail) {
      setFormError("Verify your email before submitting registration.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/seminars/${seminar.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          preferred_name: preferredName.trim() || null,
          email: verifiedEmail,
          phone: phone.trim(),
          job_title: jobTitle.trim(),
          company: company.trim(),
          city: city.trim(),
          state_province: stateProvince.trim(),
          country: country.trim(),
          position,
          position_other: position.startsWith("Other") ? positionOther.trim() : null,
          membership_status: membershipStatus,
          member_id:
            membershipStatus === "association_member" ? memberId.trim() : null,
          earning_ceu: earningCeu === "yes",
          designations: earningCeu === "yes" ? designations.trim() || null : null,
          attendance,
          accommodations: accommodations.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Unable to submit registration.",
        );
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      window.location.href = `/professional-development/seminars/${seminar.id}/register/success?registration_id=${data.id}`;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to submit registration.");
    } finally {
      setSubmitting(false);
    }
  }

  const unlocked = Boolean(accessToken && verifiedEmail);
  const coverUrl = seminar.cover_url?.trim() || null;

  return (
    <>
      <PageHero
        eyebrow="Seminars"
        title={seminar.title}
        lead={seminar.description}
        backHref="/professional-development"
        backLabel="Back to professional development"
      >
        {coverUrl ? (
          <figure className="mt-8 max-w-3xl">
            <div className="overflow-hidden rounded-none bg-caisbe-text-dark shadow-hopewell ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt=""
                draggable={false}
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          </figure>
        ) : null}
        <dl
          className={`max-w-3xl space-y-3 text-sm leading-6 text-caisbe-text ${
            coverUrl ? "mt-8" : "mt-6"
          }`}
        >
          {seminar.event_date_label ? (
            <div>
              <dt className="font-semibold text-caisbe-text-dark">Date</dt>
              <dd className="mt-0.5 break-words">{seminar.event_date_label}</dd>
            </div>
          ) : null}
          {seminar.event_time_label ? (
            <div>
              <dt className="font-semibold text-caisbe-text-dark">Time</dt>
              <dd className="mt-0.5 break-words">{seminar.event_time_label}</dd>
            </div>
          ) : null}
          {seminar.event_format_label ? (
            <div>
              <dt className="font-semibold text-caisbe-text-dark">Format</dt>
              <dd className="mt-0.5 break-words">{seminar.event_format_label}</dd>
            </div>
          ) : null}
        </dl>
      </PageHero>

      {!registrationOpen ? (
        <ContentSection title="Registration closed">
          <p className="text-base leading-7 text-caisbe-muted">
            Online registration for this seminar is currently closed.
          </p>
        </ContentSection>
      ) : (
        <>
          <ContentSection title="Email verification">
            <p className="max-w-3xl text-base leading-7 text-caisbe-text">
              Members and non-members can register. Enter your email address and we will
              send a secure link. After you open the link from your inbox, the registration
              form for this seminar will unlock.
            </p>
            {unlocked ? (
              <p className="mt-4 rounded-lg border border-caisbe-green/30 bg-caisbe-green/5 px-4 py-3 text-sm text-caisbe-text">
                Verified as <strong>{verifiedEmail}</strong>. Complete the form below.
              </p>
            ) : (
              <form onSubmit={requestAccess} className="mt-6 max-w-xl space-y-4">
                <label className="block text-sm font-semibold text-caisbe-text-dark">
                  Email address *
                  <input
                    type="email"
                    required
                    className={fieldClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
                <button
                  type="submit"
                  disabled={gateBusy}
                  className="inline-flex w-full items-center justify-center rounded-none bg-caisbe-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-caisbe-red-dark disabled:opacity-60 sm:w-auto"
                >
                  {gateBusy ? "Sending…" : "Send registration link"}
                </button>
              </form>
            )}
            {gateMessage ? <p className="mt-4 text-sm text-caisbe-green">{gateMessage}</p> : null}
            {gateError ? <p className="mt-4 text-sm text-caisbe-red">{gateError}</p> : null}
          </ContentSection>

          {unlocked ? (
            <ContentSection title="Registration information">
              <p className="max-w-3xl text-base leading-7 text-caisbe-text">
                Please complete the fields below to secure your place. Required fields are
                marked with an asterisk (*).
              </p>
              <form onSubmit={submitRegistration} className="mt-8 max-w-3xl space-y-8">
                <fieldset className="space-y-4">
                  <legend className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
                    Personal / contact details
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold">
                      First name *
                      <input required className={fieldClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </label>
                    <label className="block text-sm font-semibold">
                      Last name *
                      <input required className={fieldClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </label>
                  </div>
                  <label className="block text-sm font-semibold">
                    Preferred name (optional)
                    <input className={fieldClass} value={preferredName} onChange={(e) => setPreferredName(e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold">
                    Email address *
                    <input
                      required
                      type="email"
                      className={`${fieldClass} bg-[#fafafa]`}
                      value={verifiedEmail}
                      readOnly
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold">
                      Phone number *
                      <input required className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </label>
                    <label className="block text-sm font-semibold">
                      Job title *
                      <input required className={fieldClass} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
                    Company & industry segment
                  </legend>
                  <label className="block text-sm font-semibold">
                    Company / organization name *
                    <input required className={fieldClass} value={company} onChange={(e) => setCompany(e.target.value)} />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block text-sm font-semibold">
                      City *
                      <input required className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} />
                    </label>
                    <label className="block text-sm font-semibold">
                      State / province *
                      <input required className={fieldClass} value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} />
                    </label>
                    <label className="block text-sm font-semibold sm:col-span-2 lg:col-span-1">
                      Country *
                      <input required className={fieldClass} value={country} onChange={(e) => setCountry(e.target.value)} />
                    </label>
                  </div>
                  <label className="block text-sm font-semibold">
                    Position *
                    <select
                      required
                      className={fieldClass}
                      value={position}
                      onChange={(e) => setPosition(e.target.value as PositionOption)}
                    >
                      {POSITION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  {position.startsWith("Other") ? (
                    <label className="block text-sm font-semibold">
                      Please specify *
                      <input
                        required
                        className={fieldClass}
                        value={positionOther}
                        onChange={(e) => setPositionOther(e.target.value)}
                      />
                    </label>
                  ) : null}
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
                    Membership status
                  </legend>
                  <div className="space-y-2 text-sm">
                    {(
                      [
                        ["association_member", "Association member"],
                        ["non_member", "Non-member"],
                        ["student", "Student / emerging professional"],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 font-semibold">
                        <input
                          type="radio"
                          name="membership"
                          checked={membershipStatus === value}
                          onChange={() => setMembershipStatus(value)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {membershipStatus === "association_member" ? (
                    <label className="block text-sm font-semibold">
                      Member ID *
                      <input
                        required
                        className={fieldClass}
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                      />
                    </label>
                  ) : null}
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
                    Professional tracking
                  </legend>
                  <p className="text-sm text-caisbe-text">
                    Are you earning continuing education for a professional designation in
                    Canada, Africa, or similar? *
                  </p>
                  <div className="flex gap-6 text-sm font-semibold">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="ceu"
                        checked={earningCeu === "yes"}
                        onChange={() => setEarningCeu("yes")}
                      />
                      Yes
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="ceu"
                        checked={earningCeu === "no"}
                        onChange={() => setEarningCeu("no")}
                      />
                      No
                    </label>
                  </div>
                  {earningCeu === "yes" ? (
                    <label className="block text-sm font-semibold">
                      Which designation(s)? (optional)
                      <input
                        className={fieldClass}
                        value={designations}
                        onChange={(e) => setDesignations(e.target.value)}
                        placeholder="e.g. CFM, FMP, SFP"
                      />
                    </label>
                  ) : null}
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
                    Additional preferences
                  </legend>
                  <p className="text-sm font-semibold">Attendance preference *</p>
                  <div className="flex gap-6 text-sm font-semibold">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="attendance"
                        checked={attendance === "in_person"}
                        onChange={() => setAttendance("in_person")}
                      />
                      In-person
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="attendance"
                        checked={attendance === "virtual"}
                        onChange={() => setAttendance("virtual")}
                      />
                      Virtual
                    </label>
                  </div>
                  <label className="block text-sm font-semibold">
                    Special accommodations or dietary needs (optional)
                    <textarea
                      className={`${fieldClass} min-h-24`}
                      value={accommodations}
                      onChange={(e) => setAccommodations(e.target.value)}
                    />
                  </label>
                </fieldset>

                <div className="rounded-none border border-ifma-border bg-[#fafafa] p-4 sm:p-6">
                  <h3 className="font-hopewell-display text-lg font-bold text-caisbe-text-dark">
                    Investment
                  </h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[16rem] max-w-md text-left text-sm">
                      <thead>
                        <tr className="border-b border-ifma-border text-caisbe-muted">
                          <th className="py-2 pr-4 font-semibold">Registration category</th>
                          <th className="py-2 font-semibold">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="text-caisbe-text">
                        <tr className="border-b border-ifma-border/70">
                          <td className="py-2 pr-4">Association member</td>
                          <td className="py-2 font-semibold">{formatUsd(memberCents)}</td>
                        </tr>
                        <tr className="border-b border-ifma-border/70">
                          <td className="py-2 pr-4">Non-member</td>
                          <td className="py-2 font-semibold">{formatUsd(nonMemberCents)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4">Student / emerging professional</td>
                          <td className="py-2 font-semibold">{formatUsd(studentCents)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 text-sm text-caisbe-text">
                    Your selected rate: <strong>{formatUsd(selectedRate)}</strong>
                  </p>
                  <p className="mt-3 text-sm text-caisbe-muted">
                    Not a member?{" "}
                    <a href="/membership" className="font-semibold text-caisbe-red hover:text-caisbe-red-dark">
                      Join today
                    </a>{" "}
                    to save on registration and unlock ongoing education discounts.
                  </p>
                </div>

                {formError ? <p className="text-sm text-caisbe-red">{formError}</p> : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center rounded-none bg-caisbe-red px-6 py-3 text-sm font-semibold text-white transition hover:bg-caisbe-red-dark disabled:opacity-60 sm:w-auto"
                >
                  {submitting ? "Submitting…" : `Continue to payment (${formatUsd(selectedRate)})`}
                </button>
              </form>
            </ContentSection>
          ) : null}

          <ContentSection title="Registration deadlines & policies">
            <div className="max-w-3xl space-y-4 text-sm leading-7 text-caisbe-text">
              <p>
                Online registration closes at the end of the registration date, or when
                capacity is reached, whichever occurs first. On-site or same-day registration
                is not available. Confirmation and access instructions are sent by email
                within one business day of payment.
              </p>
              <p>
                Cancellations received in writing before the seminar date receive a full
                refund less a $25 administrative fee. No refunds after the seminar date.
                Substitutions may be made prior to the event by notifying the registration
                team in writing.
              </p>
              <p>
                In-person attendees receive venue details approximately one week prior.
                Virtual attendees receive a unique access link no later than 48 hours before
                start time. Certificates of completion are issued electronically within 10
                business days after the seminar.
              </p>
              <p>
                By registering, you agree to the event’s code of conduct and consent to the
                use of your name and organization on the attendee list (opt-out available upon
                request).
              </p>
            </div>
            <div className="mt-6">
              <ButtonLink href="/contact" variant="secondary">
                Contact registration team
              </ButtonLink>
            </div>
          </ContentSection>
        </>
      )}
    </>
  );
}
