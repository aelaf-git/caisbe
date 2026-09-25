"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

const TYPES = [
  { id: "student", label: "Student Membership" },
  { id: "professional", label: "Professional Membership" },
  { id: "corporate", label: "Corporate Membership" },
  { id: "senior-fellow", label: "Senior Member / Fellow" },
  { id: "institutional", label: "Institutional Member" },
];

const inputClass =
  "mt-1 h-11 w-full rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-red";

export default function JoinCaisbeForm() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    address: "",
    organization: "",
    job_title: "",
    membership_type: "student",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/membership/apply", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage("Application received. If you already have a student account, these details were copied onto your profile.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-10 grid gap-4 border border-ifma-border bg-white p-6 md:grid-cols-2">
      <h2 className="font-display text-xl font-semibold text-caisbe-text-dark md:col-span-2">Join CAISBE</h2>
      <p className="text-sm text-caisbe-muted md:col-span-2">
        This form uses the same membership fields as the student portal. It does not enroll you in a course.
      </p>
      {error ? <p className="text-sm text-caisbe-red md:col-span-2">{error}</p> : null}
      {message ? <p className="text-sm text-caisbe-text md:col-span-2">{message}</p> : null}
      <label className="text-sm">Full name<input className={inputClass} required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
      <label className="text-sm">Email<input type="email" className={inputClass} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="text-sm">Phone<input className={inputClass} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
      <label className="text-sm">Country<input className={inputClass} required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
      <label className="text-sm">City<input className={inputClass} required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
      <label className="text-sm md:col-span-2">Address<input className={inputClass} required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
      <label className="text-sm">Organization<input className={inputClass} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></label>
      <label className="text-sm">Job title<input className={inputClass} value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></label>
      <label className="text-sm md:col-span-2">Membership type
        <select className={inputClass} value={form.membership_type} onChange={(e) => setForm({ ...form, membership_type: e.target.value })}>
          {TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <div className="md:col-span-2">
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-60">
          {busy ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </form>
  );
}
