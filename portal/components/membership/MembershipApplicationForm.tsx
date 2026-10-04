"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiFetch, ApiError, type AuthUser } from "@/lib/auth";
import {
  additionalMembershipOptions,
  baseMembershipOptions,
  chapterMembershipOptions,
  membershipApplicationCopy,
  siteUrl,
  withBaseMembershipLabels,
  type AdditionalMembershipId,
  type BaseMembershipId,
  type MembershipCertificateTypePublic,
} from "@/lib/membershipApplication";
import PasswordCriteriaList from "@/components/ui/PasswordCriteriaList";
import { MIN_PASSWORD_LENGTH, passwordStrengthError } from "@/lib/password";

const inputClass =
  "mt-1 h-11 w-full rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-red";

const SUPPORTING_ACCEPT =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

type Mode = "online" | "upload";
type Kind = "application" | "renewal";
type Variant = "register" | "account";
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

function RequiredMark() {
  return (
    <span className="ml-0.5 text-caisbe-red" aria-hidden>
      *
    </span>
  );
}

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <path d="M1 1l22 22" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Field({
  label,
  hint,
  required = false,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm font-semibold text-caisbe-text-dark ${className}`}>
      <span>
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      {hint ? (
        <span className="mt-1 block text-xs font-normal leading-5 text-caisbe-muted">{hint}</span>
      ) : null}
      {children}
    </label>
  );
}

function SectionBar({ title, required = false }: { title: string; required?: boolean }) {
  return (
    <div className="mt-8 flex items-center gap-3 md:col-span-2">
      <span className="h-3 w-3 shrink-0 rounded-full border-2 border-caisbe-red bg-white" />
      <h3 className="font-hopewell-display text-sm font-bold uppercase tracking-wide text-caisbe-red">
        {title}
        {required ? <RequiredMark /> : null}
      </h3>
      <span className="h-0.5 flex-1 bg-caisbe-red" />
    </div>
  );
}

function splitName(fullName?: string | null) {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function isOrganizationMembership(api: string | undefined) {
  return api === "institutional" || api === "corporate";
}

export default function MembershipApplicationForm({
  kind,
  variant = "account",
  user = null,
  onRegistered,
  onSuccess,
}: {
  kind: Kind;
  variant?: Variant;
  user?: AuthUser | null;
  onRegistered?: () => void;
  onSuccess?: () => void;
}) {
  const { register } = useAuth();
  const names = splitName(user?.full_name || user?.given_name);
  const [mode, setMode] = useState<Mode>("online");
  const [firstName, setFirstName] = useState(user?.given_name || names.first);
  const [lastName, setLastName] = useState(user?.family_name || names.last);
  const [designation, setDesignation] = useState("");
  const [position, setPosition] = useState(user?.job_title || "");
  const [organization, setOrganization] = useState(user?.organization || "");
  const [email, setEmail] = useState(user?.email || "");
  const [mobile, setMobile] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [city, setCity] = useState(user?.city || "");
  const [stateProvince, setStateProvince] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState(user?.country || "");
  const [businessPhone, setBusinessPhone] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [base, setBase] = useState<FlagMap<BaseMembershipId>>(() => {
    const flags = emptyFlags(baseIds);
    if (variant === "register") flags.student = true;
    return flags;
  });
  const [chapter, setChapter] = useState<FlagMap<BaseMembershipId>>(() => emptyFlags(chapterIds));
  const [additional, setAdditional] = useState<FlagMap<AdditionalMembershipId>>(() =>
    emptyFlags(additionalIds),
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [supportingDocument, setSupportingDocument] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [certPrices, setCertPrices] = useState<MembershipCertificateTypePublic[] | null>(null);

  const isRenewal = kind === "renewal";
  const isRegister = variant === "register";
  const title = isRegister
    ? "Create your CAISBE account"
    : isRenewal
      ? "Membership Renewal"
      : "Upgrade membership";
  const printHref = siteUrl(isRenewal ? "/membership/forms/renewal" : "/membership/forms/application");

  const labeledBaseOptions = useMemo(() => withBaseMembershipLabels(certPrices), [certPrices]);
  const selectedBase = useMemo(
    () => labeledBaseOptions.filter((option) => base[option.id]),
    [labeledBaseOptions, base],
  );
  const selectedType =
    selectedBase.find((option) => option.api !== "student")?.api || selectedBase[0]?.api;
  const orgMembership = isOrganizationMembership(selectedType);
  const personalMembership = Boolean(selectedType) && !orgMembership;
  const supportingRequired = orgMembership && (mode === "online" || isRegister);
  const supportingLabel = orgMembership
    ? "Licence or certification"
    : "Educational qualifications or certifications";
  const supportingHint = orgMembership
    ? "Attach your organisation licence or certification (PDF, Word, or image)."
    : "Optionally attach educational qualifications or professional certifications (PDF, Word, or image).";
  useEffect(() => {
    let active = true;
    apiFetch<MembershipCertificateTypePublic[]>("/membership/certificate-types", { auth: false })
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

  useEffect(() => {
    setSupportingDocument(null);
  }, [selectedType]);

  function toggle<T extends string>(
    current: FlagMap<T>,
    setCurrent: (next: FlagMap<T>) => void,
    id: T,
  ) {
    setCurrent({ ...current, [id]: !current[id] });
  }

  function selectBase(id: BaseMembershipId) {
    const flags = emptyFlags(baseIds);
    flags[id] = true;
    setBase(flags);
  }

  async function uploadSupportingDocument(doc: File, label: string) {
    const body = new FormData();
    body.append("file", doc);
    body.append("label", label);
    await apiFetch("/me/membership/supporting-document", { method: "POST", body });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "upload") {
      if (!file) {
        setError("Please upload your completed membership form.");
        return;
      }
      if (isRegister) {
        setError("Create your account with the online form first, then you can upload renewals from Membership.");
        return;
      }
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const maxBytes = 20 * 1024 * 1024;
        if (file.size > maxBytes) {
          throw new ApiError(413, "File is too large. Maximum size is 20 MB.");
        }
        const body = new FormData();
        body.append("file", file);
        body.append("kind", kind);
        await apiFetch("/me/membership/apply-file", { method: "POST", body });
        setMessage(
          isRenewal
            ? "Your completed renewal form was received and your membership was updated."
            : "Your completed membership form was received and your membership was updated.",
        );
        setFile(null);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Unable to upload the form.");
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
    if (isRegister) {
      const passwordError = passwordStrengthError(password, confirmPassword);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }
    if (supportingRequired && !supportingDocument) {
      setError("Please attach your licence or certification.");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const phone = mobile.trim() || businessPhone.trim();
    const baseLabels = checkedLabels(labeledBaseOptions, base);
    const chapterLabels = checkedLabels(chapterMembershipOptions, chapter);
    const additionalLabels = checkedLabels(additionalMembershipOptions, additional);
    const lines = [
      isRenewal ? "Renewal" : isRegister ? "New account" : "Membership upgrade",
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
    const details = lines.join("\n").slice(0, 8000);

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const selectedIsStudent = (selectedType || "student") === "student";

      if (isRegister) {
        await register({
          full_name: fullName,
          email,
          phone,
          country,
          city,
          password,
          given_name: firstName.trim() || null,
          family_name: lastName.trim() || null,
          address: address.trim() || null,
          organization: organization.trim().slice(0, 160) || null,
          job_title: position.trim().slice(0, 120) || null,
          membership_type: selectedType,
          details,
        });
        if (supportingDocument) {
          await uploadSupportingDocument(supportingDocument, supportingLabel);
        }
        onRegistered?.();
        return;
      }

      const body = new FormData();
      body.append("full_name", fullName);
      body.append("email", email);
      body.append("phone", phone);
      body.append("country", country);
      body.append("city", city);
      if (address.trim()) body.append("address", address.trim());
      if (organization.trim()) body.append("organization", organization.trim().slice(0, 160));
      if (position.trim()) body.append("job_title", position.trim().slice(0, 120));
      body.append("membership_type", selectedType || "student");
      body.append("details", details);
      body.append("kind", kind);
      if (supportingDocument) {
        body.append("supporting_document", supportingDocument);
        body.append("supporting_document_label", supportingLabel);
      }
      await apiFetch("/me/membership/apply", { method: "POST", body });
      setMessage(
        selectedIsStudent
          ? isRenewal
            ? "Renewal received. Your student membership certificate is ready."
            : "Student membership is active. Your certificate is ready to download."
          : isRenewal
            ? "Renewal application received. Confirm payment below to extend your certificate."
            : "Application received. Confirm payment below to activate this membership and update your certificate.",
      );
      setSupportingDocument(null);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : err instanceof Error ? err.message : "Unable to submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="rounded-[20px] bg-white p-6 shadow-hopewell md:p-8"
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
      <p className="mt-3 text-xs text-caisbe-muted">
        Fields marked with <span className="font-semibold text-caisbe-red">*</span> are required.
      </p>

      {isRegister ? null : (
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
      )}

      {mode === "upload" && !isRegister ? (
        <div className="mt-4 rounded-[20px] bg-[#f8fafc] px-4 py-4 text-sm text-caisbe-text">
          <p className="font-semibold text-caisbe-text-dark">
            {isRenewal ? "Renewal form" : "Membership form"}
          </p>
          <p className="mt-2 leading-6 text-caisbe-muted">
            Download the form, complete it, then upload the finished file.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            {isRenewal ? null : (
              <a
                href={siteUrl("/forms/caisbe-membership-registration.docx")}
                download="CAISBE-Membership-Registration.docx"
                className="inline-flex text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark"
              >
                Download Word form
              </a>
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
            <span>
              Upload completed form (PDF or Word)
              <RequiredMark />
            </span>
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

      {mode === "online" || isRegister ? (
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
        <Field label="First Name" required>
          <input className={inputClass} required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last Name" required>
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
          required={orgMembership}
          className="md:col-span-2"
        >
          <input
            className={inputClass}
            required={orgMembership}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
        </Field>
        <Field label="Email" required>
          <input
            type="email"
            className={inputClass}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={!isRegister && Boolean(user?.email)}
          />
        </Field>
        <Field label="Mobile/Phone Number" required>
          <input className={inputClass} required value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </Field>
        {isRegister ? (
          <>
            <Field
              label="Password"
              hint={`Use at least ${MIN_PASSWORD_LENGTH} characters with upper and lower case letters, a number, and a special character.`}
              required
              className="md:col-span-2"
            >
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${inputClass} pr-12`}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((open) => !open)}
                  className="absolute inset-y-0 right-0 top-1 inline-flex h-11 w-12 items-center justify-center text-caisbe-muted transition-colors hover:text-caisbe-red"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <PasswordVisibilityIcon visible={showPassword} />
                </button>
              </div>
            </Field>
            <PasswordCriteriaList password={password} className="md:col-span-2" />
            <Field label="Confirm password" required className="md:col-span-2">
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`${inputClass} pr-12`}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((open) => !open)}
                  className="absolute inset-y-0 right-0 top-1 inline-flex h-11 w-12 items-center justify-center text-caisbe-muted transition-colors hover:text-caisbe-red"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  aria-pressed={showConfirmPassword}
                >
                  <PasswordVisibilityIcon visible={showConfirmPassword} />
                </button>
              </div>
            </Field>
            <PasswordCriteriaList
              password={password}
              confirmPassword={confirmPassword}
              mode="match"
              className="md:col-span-2"
            />
          </>
        ) : null}
        <Field label="Address">
          <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="City" required>
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
        <Field label="Country" required>
          <input className={inputClass} required value={country} onChange={(e) => setCountry(e.target.value)} />
        </Field>
        <Field label="Business Phone" className="md:col-span-2">
          <input className={inputClass} value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
        </Field>

        <SectionBar title="Base membership" required />
        <fieldset className="md:col-span-2">
          <legend className="sr-only">Base membership (required)</legend>
          <p className="mb-3 text-xs leading-5 text-caisbe-muted">
            Prices follow the current CAISBE membership catalog. Student is free; other types are paid after
            {isRegister ? " you create your account" : " you submit this application"}.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {labeledBaseOptions.map((option) => {
              const selected = base[option.id];
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-3 text-sm transition ${
                    selected
                      ? "border-caisbe-red bg-caisbe-red/5 text-caisbe-text-dark"
                      : "border-ifma-border bg-white text-caisbe-text hover:border-caisbe-red"
                  }`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <input
                      type="radio"
                      name="base-membership"
                      className="h-4 w-4 accent-caisbe-red"
                      checked={selected}
                      onChange={() => selectBase(option.id)}
                      required={selectedBase.length === 0}
                    />
                    <span className="font-medium">{option.name}</span>
                  </span>
                  <span
                    className={`shrink-0 text-xs font-bold uppercase tracking-wide ${
                      option.priceCents === 0 ? "text-caisbe-muted" : "text-caisbe-red"
                    }`}
                  >
                    {option.priceLabel}
                  </span>
                </label>
              );
            })}
          </div>
          {selectedBase[0] ? (
            <p className="mt-3 rounded-md bg-[#f8fafc] px-3 py-2 text-sm text-caisbe-text">
              Selected: <span className="font-semibold">{selectedBase[0].name}</span>
              {" · "}
              <span className="font-semibold text-caisbe-red">{selectedBase[0].priceLabel}</span>
              {selectedBase[0].api !== "student" ? (
                <span className="mt-1 block text-xs text-caisbe-muted">
                  {isRegister
                    ? "You get a free student certificate on signup. This paid type unlocks after you confirm payment on Membership."
                    : "Confirm payment on this page to activate this membership certificate."}
                </span>
              ) : (
                <span className="mt-1 block text-xs text-caisbe-muted">
                  Student membership includes a free lifetime certificate.
                </span>
              )}
            </p>
          ) : null}
        </fieldset>

        {personalMembership || orgMembership ? (
          <>
            <SectionBar title="Supporting documents" required={supportingRequired} />
            <Field
              label={supportingLabel}
              hint={supportingHint}
              required={supportingRequired}
              className="md:col-span-2"
            >
              <input
                type="file"
                accept={SUPPORTING_ACCEPT}
                required={supportingRequired}
                className="mt-2 block w-full text-sm font-normal text-caisbe-text file:mr-3 file:rounded-full file:border-0 file:bg-caisbe-red file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                onChange={(e) => setSupportingDocument(e.target.files?.[0] ?? null)}
              />
              {supportingDocument ? (
                <span className="mt-2 block text-xs font-normal text-caisbe-muted">
                  Selected: {supportingDocument.name}
                </span>
              ) : null}
            </Field>
          </>
        ) : null}

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

      {mode === "online" || isRegister ? (
      <label className="mt-8 flex gap-3 rounded-[20px] bg-caisbe-text-dark px-4 py-4 text-sm leading-6 text-white">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-caisbe-red"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          required
        />
        <span>
          <span className="font-semibold">
            Agreement
            <RequiredMark />
          </span>
          <span className="mt-1 block">{membershipApplicationCopy.agreement}</span>
        </span>
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
            : isRegister
              ? "Create account"
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
