"use client";

import { FormEvent, useState } from "react";
import { apiFetch, ApiError, type AuthUser } from "@/lib/auth";
import { MEMBERSHIP_TYPES } from "@/lib/commerce";

const inputClass =
  "h-11 w-full rounded-md border border-ifma-border bg-admin-surface px-3 text-sm text-caisbe-text outline-none focus:border-caisbe-red";

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
};

export function profileFromUser(user: AuthUser | null): ProfileFields {
  return {
    full_name: user?.full_name ?? "",
    given_name: user?.given_name ?? "",
    family_name: user?.family_name ?? "",
    phone: user?.phone ?? "",
    country: user?.country ?? "",
    city: user?.city ?? "",
    address: user?.address ?? "",
    organization: user?.organization ?? "",
    job_title: user?.job_title ?? "",
    membership_type: user?.membership_type ?? "student",
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

  function update<K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const user = await apiFetch<AuthUser>("/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify(form),
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
      <label className="block text-sm md:col-span-2">
        <span className="font-medium text-caisbe-text">Full name</span>
        <input className={`${inputClass} mt-1`} value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-caisbe-text">Given name</span>
        <input className={`${inputClass} mt-1`} value={form.given_name} onChange={(e) => update("given_name", e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-caisbe-text">Family name</span>
        <input className={`${inputClass} mt-1`} value={form.family_name} onChange={(e) => update("family_name", e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-caisbe-text">Phone</span>
        <input className={`${inputClass} mt-1`} value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-caisbe-text">Country</span>
        <input className={`${inputClass} mt-1`} value={form.country} onChange={(e) => update("country", e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-caisbe-text">City</span>
        <input className={`${inputClass} mt-1`} value={form.city} onChange={(e) => update("city", e.target.value)} required />
      </label>
      <label className="block text-sm md:col-span-2">
        <span className="font-medium text-caisbe-text">Address</span>
        <input className={`${inputClass} mt-1`} value={form.address} onChange={(e) => update("address", e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-caisbe-text">Organization</span>
        <input className={`${inputClass} mt-1`} value={form.organization} onChange={(e) => update("organization", e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-caisbe-text">Job title</span>
        <input className={`${inputClass} mt-1`} value={form.job_title} onChange={(e) => update("job_title", e.target.value)} />
      </label>
      <label className="block text-sm md:col-span-2">
        <span className="font-medium text-caisbe-text">Membership type</span>
        <select
          className={`${inputClass} mt-1`}
          value={form.membership_type}
          onChange={(e) => update("membership_type", e.target.value)}
          required
        >
          {MEMBERSHIP_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
