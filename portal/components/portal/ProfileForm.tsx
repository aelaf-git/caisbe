"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import SaveButton from "@/components/ui/SaveButton";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { apiFetch, ApiError, type AuthUser } from "@/lib/auth";
import { membershipTypeLabel } from "@/lib/commerce";

const inputClass =
  "mt-1 h-11 w-full rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-red";

const readOnlyClass =
  "mt-1 h-11 w-full rounded-md border border-ifma-border bg-admin-surface px-3 text-sm text-caisbe-muted outline-none";

export type ProfileFields = {
  full_name: string;
  given_name: string;
  family_name: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  organization: string;
  job_title: string;
  membership_type: string;
  email: string;
};

function RequiredMark() {
  return (
    <span className="ml-0.5 text-caisbe-red" aria-hidden>
      *
    </span>
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

function SectionBar({ title }: { title: string }) {
  return (
    <div className="mt-2 flex items-center gap-3 md:col-span-2">
      <span className="h-3 w-3 shrink-0 rounded-full border-2 border-caisbe-red bg-white" />
      <h3 className="font-hopewell-display text-sm font-bold uppercase tracking-wide text-caisbe-red">
        {title}
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

export function profileFromUser(user: AuthUser | null): ProfileFields {
  const names = splitName(user?.full_name);
  return {
    full_name: user?.full_name ?? "",
    given_name: user?.given_name || names.first,
    family_name: user?.family_name || names.last,
    phone: user?.phone ?? "",
    country: user?.country ?? "",
    city: user?.city ?? "",
    address: user?.address ?? "",
    organization: user?.organization ?? "",
    job_title: user?.job_title ?? "",
    membership_type: user?.membership_type ?? "student",
    email: user?.email ?? "",
  };
}

export default function ProfileForm({
  initial,
  submitLabel = "Save profile",
  onSaved,
}: {
  initial: ProfileFields;
  submitLabel?: string;
  onSaved?: (user: AuthUser) => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const editableValues = useMemo(
    () => ({
      given_name: form.given_name,
      family_name: form.family_name,
      phone: form.phone,
      country: form.country,
      city: form.city,
      address: form.address,
      organization: form.organization,
      job_title: form.job_title,
    }),
    [form],
  );
  const { dirty, markSaved, resetBaseline } = useDirtyForm(editableValues);

  useEffect(() => {
    setForm(initial);
    resetBaseline({
      given_name: initial.given_name,
      family_name: initial.family_name,
      phone: initial.phone,
      country: initial.country,
      city: initial.city,
      address: initial.address,
      organization: initial.organization,
      job_title: initial.job_title,
    });
  }, [initial, resetBaseline]);

  function update<K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!dirty) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const given = form.given_name.trim();
      const family = form.family_name.trim();
      const fullName = `${given} ${family}`.trim() || form.full_name.trim();
      const user = await apiFetch<AuthUser>("/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName,
          given_name: given || null,
          family_name: family || null,
          phone: form.phone.trim(),
          country: form.country.trim(),
          city: form.city.trim(),
          address: form.address.trim() || null,
          organization: form.organization.trim().slice(0, 160) || null,
          job_title: form.job_title.trim().slice(0, 120) || null,
        }),
      });
      const next = profileFromUser(user);
      setForm(next);
      markSaved({
        given_name: next.given_name,
        family_name: next.family_name,
        phone: next.phone,
        country: next.country,
        city: next.city,
        address: next.address,
        organization: next.organization,
        job_title: next.job_title,
      });
      setMessage("Profile saved.");
      onSaved?.(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 md:grid-cols-2">
      {error ? <p className="text-sm text-caisbe-red md:col-span-2">{error}</p> : null}
      {message ? <p className="text-sm text-caisbe-text md:col-span-2">{message}</p> : null}

      <SectionBar title="Personal information" />
      <Field label="First Name" required>
        <input
          className={inputClass}
          required
          value={form.given_name}
          onChange={(e) => update("given_name", e.target.value)}
        />
      </Field>
      <Field label="Last Name" required>
        <input
          className={inputClass}
          required
          value={form.family_name}
          onChange={(e) => update("family_name", e.target.value)}
        />
      </Field>
      <Field label="Position/Title">
        <input
          className={inputClass}
          value={form.job_title}
          onChange={(e) => update("job_title", e.target.value)}
        />
      </Field>
      <Field label="Company/Organization">
        <input
          className={inputClass}
          value={form.organization}
          onChange={(e) => update("organization", e.target.value)}
        />
      </Field>

      <SectionBar title="Contact" />
      <Field
        label="Email"
        hint="Email cannot be changed here. Contact CAISBE if you need to update it."
        className="md:col-span-2"
      >
        <input type="email" className={readOnlyClass} value={form.email} readOnly />
      </Field>
      <Field label="Mobile/Phone Number" required>
        <input
          className={inputClass}
          required
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
      </Field>
      <Field label="Country" required>
        <input
          className={inputClass}
          required
          value={form.country}
          onChange={(e) => update("country", e.target.value)}
        />
      </Field>
      <Field label="Address" className="md:col-span-2">
        <input
          className={inputClass}
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
        />
      </Field>
      <Field label="City" required>
        <input
          className={inputClass}
          required
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
        />
      </Field>

      <SectionBar title="Membership" />
      <div className="md:col-span-2 rounded-md border border-ifma-border bg-[#f8fafc] px-4 py-3 text-sm text-caisbe-text">
        <p>
          Current membership:{" "}
          <span className="font-semibold text-caisbe-text-dark">
            {membershipTypeLabel(form.membership_type)}
          </span>
        </p>
        <p className="mt-2 text-xs leading-5 text-caisbe-muted">
          To upgrade, renew, or change membership type, use{" "}
          <Link href="/membership" className="font-semibold text-caisbe-red hover:text-caisbe-red-dark">
            Membership
          </Link>
          .
        </p>
      </div>

      <div className="md:col-span-2">
        <SaveButton type="submit" dirty={dirty} saving={saving} idleLabel={submitLabel} />
      </div>
    </form>
  );
}
