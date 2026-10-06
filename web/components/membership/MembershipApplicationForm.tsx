"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import {
  additionalMembershipOptions,
  baseMembershipOptions,
  chapterMembershipOptions,
  membershipApplicationCopy,
  withBaseMembershipLabels,
  type AdditionalMembershipId,
  type BaseMembershipId,
  type MembershipCertificateTypePublic,
} from "@/lib/data/membershipApplication";

const inputClass =
  "mt-1 h-11 w-full rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-red";

type Mode = "online" | "upload";
type Kind = "application" | "renewal";
type FlagMap<T extends string> = Record<T, boolean>;

const emptyFlags = <T extends string>(ids: readonly T[]): FlagMap<T> =>
  Object.fromEntries(ids.map((id) => [id, false])) as FlagMap<T>;

const baseIds = baseMembershipOptions.map((option) => option.id);
const chapterIds = chapterMembershipOptions.map((option) => option.id);
const additionalIds = additionalMembershipOptions.map((option) => option.id);

function checkedLabels(
  options: readonly { id: string; label: string }[],
  flags: Record<string, boolean>,
) {
  return options.filter((option) => flags[option.id]).map((option) => option.label);
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm font-semibold text-caisbe-text-dark ${className}`}>
      {label}
      {hint ? (
        <span className="mt-1 block text-xs font-normal leading-5 text-caisbe-muted">{hint}</span>
      ) : null}
      {children}
    </label>
  );
}

function SectionBar({ title }: { title: string }) {
  return (
    <div className="mt-8 flex items-center gap-3 md:col-span-2">
      <span className="h-3 w-3 shrink-0 rounded-full border-2 border-caisbe-red bg-white" />
      <h3 className="font-hopewell-display text-sm font-bold uppercase tracking-wide text-caisbe-red">
        {title}
      </h3>
      <span className="h-0.5 flex-1 bg-caisbe-red" />
    </div>
  );
}

export default function MembershipApplicationForm({ kind }: { kind: Kind }) {
  const [mode, setMode] = useState<Mode>("online");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [designation, setDesignation] = useState("");
  const [position, setPosition] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [base, setBase] = useState<FlagMap<BaseMembershipId>>(() => emptyFlags(baseIds));
  const [chapter, setChapter] = useState<FlagMap<BaseMembershipId>>(() => emptyFlags(chapterIds));
  const [additional, setAdditional] = useState<FlagMap<AdditionalMembershipId>>(() =>
    emptyFlags(additionalIds),
  );
  const [agreed, setAgreed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [certPrices, setCertPrices] = useState<MembershipCertificateTypePublic[] | null>(null);

  const isRenewal = kind === "renewal";
  const title = isRenewal ? "Membership Renewal" : "Membership Application";
  const printHref = isRenewal ? "/membership/forms/renewal" : "/membership/forms/application";

  const labeledBaseOptions = useMemo(() => withBaseMembershipLabels(certPrices), [certPrices]);

  useEffect(() => {
    let active = true;
    apiFetch<MembershipCertificateTypePublic[]>("/membership/certificate-types")
      .then((rows) => {
        if (active) setCertPrices(rows);
      })
      .catch(() => {
        if (active) setCertPrices([]);
      });
    return () => {
      active = false;
    };
  }, []);

  function toggle<T extends string>(
    current: FlagMap<T>,
    setCurrent: (next: FlagMap<T>) => void,
    id: T,
  ) {
    setCurrent({ ...current, [id]: !current[id] });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const selectedBase = labeledBaseOptions.filter((option) => base[option.id]);
    if (mode === "upload") {
      if (!file) {
        setError("Please upload your completed membership form.");
        return;
      }
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const maxBytes = 20 * 1024 * 1024;
        if (file.size > maxBytes) {
          throw new Error("File is too large. Maximum size is 20 MB.");
        }
        const body = new FormData();
        body.append("file", file);
        body.append("kind", kind);
        const response = await fetch("/api/membership/apply-file", { method: "POST", body });
        if (!response.ok) {
          let detail = "Unable to upload the form.";
          try {
            const data = (await response.json()) as { detail?: string };
            if (typeof data.detail === "string") detail = data.detail;
          } catch {
            // keep default
          }
          throw new Error(detail);
        }
        setMessage(
          isRenewal
            ? "Your completed renewal form was received."
            : "Your completed membership form was received.",
        );
        setFile(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to upload the form.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (selectedBase.length === 0) {
      setError("Select a base membership.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the CAISBE bylaws and code of ethics.");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const phone = mobile.trim() || businessPhone.trim();
    const baseLabels = checkedLabels(labeledBaseOptions, base);
    const chapterLabels = checkedLabels(chapterMembershipOptions, chapter);
    const additionalLabels = checkedLabels(additionalMembershipOptions, additional);
    const lines = [
      isRenewal ? "Renewal" : "New membership",
      membershipNumber.trim() ? `Membership number: ${membershipNumber.trim()}` : null,
      designation.trim() ? `Designation: ${designation.trim()}` : null,
      stateProvince.trim() ? `State/Province: ${stateProvince.trim()}` : null,
      dateOfBirth ? `Date of birth: ${dateOfBirth}` : null,
      postalCode.trim() ? `Zip/Mail Code: ${postalCode.trim()}` : null,
      businessPhone.trim() ? `Business phone: ${businessPhone.trim()}` : null,
      baseLabels.length ? `Base membership: ${baseLabels.join(", ")}` : null,
      chapterName.trim() ? `Chapter: ${chapterName.trim()}` : null,
      chapterLabels.length ? `Chapter membership: ${chapterLabels.join(", ")}` : null,
      additionalLabels.length ? `Additional options: ${additionalLabels.join(", ")}` : null,
      "Agreed to CAISBE bylaws and code of ethics.",
    ].filter(Boolean);

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/membership/apply", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          country,
          city,
          address: address.trim() || null,
          organization: organization.trim().slice(0, 160) || null,
          job_title: position.trim().slice(0, 120) || null,
          membership_type: selectedBase[0].api,
          details: lines.join("\n").slice(0, 8000),
        }),
      });
      setMessage(
        isRenewal
          ? "Renewal request received. Our team will confirm your membership renewal."
          : "Application received. Our team will review your membership registration.",
      );
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mt-8 rounded-[20px] bg-white p-6 shadow-hopewell md:p-8"
    >
      <h2 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-caisbe-text">{membershipApplicationCopy.dues}</p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-caisbe-text">
        {membershipApplicationCopy.returnTo}{" "}
        <a href={`mailto:${membershipApplicationCopy.email}`} className="font-semibold text-caisbe-red">
          Email: {membershipApplicationCopy.email}
        </a>
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("online")}
          className={`rounded-full border-2 px-4 py-3 text-left text-sm font-semibold ${
            mode === "online"
              ? "border-caisbe-red bg-caisbe-red/5 text-caisbe-red"
              : "border-ifma-border text-caisbe-text hover:border-caisbe-red"
          }`}
        >
          Fill on the website
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`rounded-full border-2 px-4 py-3 text-left text-sm font-semibold ${
            mode === "upload"
              ? "border-caisbe-red bg-caisbe-red/5 text-caisbe-red"
              : "border-ifma-border text-caisbe-text hover:border-caisbe-red"
          }`}
        >
          Download &amp; upload form
        </button>
      </div>

      {mode === "upload" ? (
        <div className="mt-4 rounded-[20px] bg-[#f8fafc] px-4 py-4 text-sm text-caisbe-text">
          <p className="font-semibold text-caisbe-text-dark">
            {isRenewal ? "Renewal form" : "Membership form"}
          </p>
          <p className="mt-2 leading-6 text-caisbe-muted">
            Download the form, complete it, then upload the finished file.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            {isRenewal ? null : (
              <>
                <a
                  href="/forms/caisbe-membership-registration.pdf"
                  download="CAISBE-Membership-Registration.pdf"
                  className="inline-flex text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark"
                >
                  Download PDF form
                </a>
                <a
                  href="/forms/caisbe-membership-registration.docx"
                  download="CAISBE-Membership-Registration.docx"
                  className="inline-flex text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark"
                >
                  Download Word form
                </a>
              </>
            )}
            <a
              href={printHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark"
            >
              Open printable form
            </a>
          </div>
          <label className="mt-4 block font-semibold text-caisbe-text-dark">
            Upload completed form (PDF or Word)
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              required
              className="mt-2 block w-full text-sm font-normal text-caisbe-text file:mr-3 file:rounded-full file:border-0 file:bg-caisbe-red file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-caisbe-red">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-caisbe-text">{message}</p> : null}

      {mode === "online" ? (
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {isRenewal ? (
          <Field label="Membership number" className="md:col-span-2">
            <input
              className={inputClass}
              value={membershipNumber}
              onChange={(e) => setMembershipNumber(e.target.value)}
            />
          </Field>
        ) : null}
        <Field label="First Name">
          <input className={inputClass} required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last Name">
          <input className={inputClass} required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field label="Designation">
          <input className={inputClass} value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </Field>
        <Field label="Position/Title">
          <input className={inputClass} value={position} onChange={(e) => setPosition(e.target.value)} />
        </Field>
        <Field
          label="Company/Organization"
          hint={membershipApplicationCopy.organizationHint}
          className="md:col-span-2"
        >
          <input className={inputClass} value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className={inputClass}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Mobile/Phone Number">
          <input className={inputClass} required value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </Field>
        <Field label="Address">
          <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="City">
          <input className={inputClass} required value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="State/Province">
          <input className={inputClass} value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} />
        </Field>
        <Field label="Date of Birth">
          <input
            type="date"
            className={inputClass}
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </Field>
        <Field label="Zip/Mail Code">
          <input className={inputClass} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </Field>
        <Field label="Country">
          <input className={inputClass} required value={country} onChange={(e) => setCountry(e.target.value)} />
        </Field>
        <Field label="Business Phone">
          <input className={inputClass} value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
        </Field>

        <SectionBar title="Base membership" />
        <fieldset className="md:col-span-2">
          <legend className="sr-only">Base membership</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {labeledBaseOptions.map((option) => (
              <label key={option.id} className="inline-flex items-center gap-2 text-sm text-caisbe-text">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-caisbe-red"
                  checked={base[option.id]}
                  onChange={() => toggle(base, setBase, option.id)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="text-sm font-semibold text-caisbe-text-dark md:col-span-2">Chapter Membership</p>
        <Field label="Name of Chapter (if any)" className="md:col-span-2">
          <input className={inputClass} value={chapterName} onChange={(e) => setChapterName(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-x-5 gap-y-3 md:col-span-2">
          {chapterMembershipOptions.map((option) => (
            <label key={option.id} className="inline-flex items-center gap-2 text-sm text-caisbe-text">
              <input
                type="checkbox"
                className="h-4 w-4 accent-caisbe-red"
                checked={chapter[option.id]}
                onChange={() => toggle(chapter, setChapter, option.id)}
              />
              {option.label}
            </label>
          ))}
        </div>

        <p className="text-sm font-semibold text-caisbe-red md:col-span-2">Additional Membership Options</p>
        <div className="flex flex-wrap gap-x-5 gap-y-3 md:col-span-2">
          {additionalMembershipOptions.map((option) => (
            <label key={option.id} className="inline-flex items-center gap-2 text-sm text-caisbe-text">
              <input
                type="checkbox"
                className="h-4 w-4 accent-caisbe-red"
                checked={additional[option.id]}
                onChange={() => toggle(additional, setAdditional, option.id)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      ) : null}

      {mode === "online" ? (
      <label className="mt-8 flex gap-3 rounded-[20px] bg-caisbe-text-dark px-4 py-4 text-sm leading-6 text-white">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-caisbe-red"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>{membershipApplicationCopy.agreement}</span>
      </label>
      ) : null}

      <div className="mt-6">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center rounded-full bg-caisbe-red px-6 text-sm font-bold text-white hover:bg-caisbe-red-dark disabled:opacity-60"
        >
          {busy
            ? "Submitting…"
            : isRenewal
              ? mode === "upload"
                ? "Upload renewal"
                : "Submit renewal"
              : mode === "upload"
                ? "Upload application"
                : "Submit application"}
        </button>
      </div>
    </form>
  );
}
