"use client";

import { fieldClass, MEMBERSHIP_TYPES } from "@/lib/account";
import type { AuthUser } from "@/lib/auth";

export type ProfileDraft = {
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

export function draftFromUser(user: AuthUser | null): ProfileDraft {
  return {
    full_name: user?.full_name || "",
    given_name: user?.given_name || "",
    family_name: user?.family_name || "",
    phone: user?.phone || "",
    country: user?.country || "",
    city: user?.city || "",
    address: user?.address || "",
    organization: user?.organization || "",
    job_title: user?.job_title || "",
    membership_type: user?.membership_type || "student",
  };
}

export default function ProfileFields({
  value,
  onChange,
}: {
  value: ProfileDraft;
  onChange: (next: ProfileDraft) => void;
}) {
  function set<K extends keyof ProfileDraft>(key: K, next: ProfileDraft[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-caisbe-text">Full name</span>
        <input className={fieldClass} value={value.full_name} onChange={(e) => set("full_name", e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-caisbe-text">Membership type</span>
        <select className={fieldClass} value={value.membership_type} onChange={(e) => set("membership_type", e.target.value)} required>
          {MEMBERSHIP_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-caisbe-text">Given name</span>
        <input className={fieldClass} value={value.given_name} onChange={(e) => set("given_name", e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-caisbe-text">Family name</span>
        <input className={fieldClass} value={value.family_name} onChange={(e) => set("family_name", e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-caisbe-text">Phone</span>
        <input className={fieldClass} value={value.phone} onChange={(e) => set("phone", e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-caisbe-text">Country</span>
        <input className={fieldClass} value={value.country} onChange={(e) => set("country", e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-caisbe-text">City</span>
        <input className={fieldClass} value={value.city} onChange={(e) => set("city", e.target.value)} required />
      </label>
      <label className="block text-sm md:col-span-2">
        <span className="mb-1 block font-medium text-caisbe-text">Address</span>
        <input className={fieldClass} value={value.address} onChange={(e) => set("address", e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-caisbe-text">Organization</span>
        <input className={fieldClass} value={value.organization} onChange={(e) => set("organization", e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-caisbe-text">Job title</span>
        <input className={fieldClass} value={value.job_title} onChange={(e) => set("job_title", e.target.value)} />
      </label>
    </div>
  );
}
