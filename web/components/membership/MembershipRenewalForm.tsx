"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

const inputClass =
  "mt-1 h-11 w-full rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-red";
const textAreaClass =
  "mt-1 min-h-28 w-full rounded-md border border-ifma-border bg-white px-3 py-2.5 text-sm outline-none focus:border-caisbe-red";

type Mode = "online" | "upload";

export default function MembershipRenewalForm() {
  const [mode, setMode] = useState<Mode>("online");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    address: "",
    organization: "",
    job_title: "",
    membership_type: "professional",
    membership_number: "",
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "upload" && !file) {
      setError("Please upload your completed renewal form.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/membership/apply", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          country: form.country,
          city: form.city,
          address: form.address,
          organization: [
            "Renewal",
            form.membership_number ? `#${form.membership_number}` : null,
            form.organization || null,
          ]
            .filter(Boolean)
            .join(" · ")
            .slice(0, 160),
          job_title: [
            form.job_title || null,
            mode === "upload" ? `Form upload: ${file?.name}` : null,
            form.notes || null,
          ]
            .filter(Boolean)
            .join(" | ")
            .slice(0, 120) || null,
          membership_type: form.membership_type,
        }),
      });
      setMessage("Renewal request received. Our team will confirm your membership renewal.");
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
      className="mt-8 grid gap-4 border border-ifma-border bg-white p-6 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">
          Membership renewal
        </h2>
        <p className="mt-2 text-sm leading-6 text-caisbe-muted">
          Existing members can renew online, or download the renewal form, complete it, and upload
          it here.
        </p>
      </div>

      <div className="grid gap-3 md:col-span-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("online")}
          className={`rounded-md border-2 px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide ${
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
          className={`rounded-md border-2 px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide ${
            mode === "upload"
              ? "border-caisbe-red bg-caisbe-red/5 text-caisbe-red"
              : "border-ifma-border text-caisbe-text hover:border-caisbe-red"
          }`}
        >
          Download &amp; upload form
        </button>
      </div>

      {mode === "upload" ? (
        <div className="rounded-md border border-ifma-border bg-admin-canvas px-4 py-4 text-sm text-caisbe-text md:col-span-2">
          <p className="font-semibold text-caisbe-text-dark">Renewal form</p>
          <p className="mt-2 leading-6 text-caisbe-muted">
            Download the form, complete it, then upload the finished file below.
          </p>
          <a
            href="/membership/forms/renewal"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:text-caisbe-red-dark"
          >
            Download renewal form
          </a>
        </div>
      ) : null}

      {error ? <p className="text-sm text-caisbe-red md:col-span-2">{error}</p> : null}
      {message ? <p className="text-sm text-caisbe-text md:col-span-2">{message}</p> : null}

      <label className="text-sm">
        Full name
        <input
          className={inputClass}
          required
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
      </label>
      <label className="text-sm">
        Email on file
        <input
          type="email"
          className={inputClass}
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </label>
      <label className="text-sm">
        Membership number
        <input
          className={inputClass}
          placeholder="If available"
          value={form.membership_number}
          onChange={(e) => setForm({ ...form, membership_number: e.target.value })}
        />
      </label>
      <label className="text-sm">
        Phone
        <input
          className={inputClass}
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </label>
      <label className="text-sm">
        Country
        <input
          className={inputClass}
          required
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
        />
      </label>
      <label className="text-sm">
        City
        <input
          className={inputClass}
          required
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
      </label>
      <label className="text-sm md:col-span-2">
        Address
        <input
          className={inputClass}
          required
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </label>
      <label className="text-sm">
        Organization
        <input
          className={inputClass}
          value={form.organization}
          onChange={(e) => setForm({ ...form, organization: e.target.value })}
        />
      </label>
      <label className="text-sm">
        Job title
        <input
          className={inputClass}
          value={form.job_title}
          onChange={(e) => setForm({ ...form, job_title: e.target.value })}
        />
      </label>

      {mode === "online" ? (
        <label className="text-sm md:col-span-2">
          Renewal notes
          <textarea
            className={textAreaClass}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
      ) : (
        <label className="text-sm md:col-span-2">
          Upload completed renewal form (PDF or Word)
          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf"
            required
            className="mt-1 block w-full text-sm text-caisbe-text file:mr-3 file:rounded-md file:border-0 file:bg-caisbe-red file:px-4 file:py-2 file:text-sm file:font-semibold file:uppercase file:text-white"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-60"
        >
          {busy ? "Submitting…" : mode === "upload" ? "Upload renewal" : "Submit renewal"}
        </button>
      </div>
    </form>
  );
}
